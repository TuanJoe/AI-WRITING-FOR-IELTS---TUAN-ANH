import type { WritingSubmission, User, Prisma, Severity } from "@prisma/client";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { getProvider, AIProviderError } from "@/lib/ai";
import type { GenerationConfig } from "@/lib/ai/types";
import { renderTemplate } from "@/lib/prompts/render";
import { parseModelJson } from "@/lib/ai/json-repair";
import {
  scoringOutputSchema,
  type ScoringOutput,
} from "@/lib/validation/scoring-schema";
import { normalizeScores } from "@/lib/scoring/normalize";
import { getActivePrompt } from "@/services/prompt-service";
import { resolveCost } from "@/services/cost-service";
import { logUsage } from "@/services/usage-service";

// Orchestrates the AI scoring workflow (section 8). Pure server-side: validates
// model output, recomputes scores, persists results, usage and cost. Failures
// are recorded but never throw uncaught into the request path.

export interface ScoringResultSummary {
  status: "COMPLETED" | "FAILED";
  scoringResultId?: string;
  errorMessage?: string;
}

function severityFromString(value: string): Severity {
  switch (value.toLowerCase()) {
    case "low":
      return "LOW";
    case "high":
      return "HIGH";
    default:
      return "MEDIUM";
  }
}

/** Resolve which model to use: routing rule by plan/task, else prompt, else env. */
async function resolveModel(
  user: User,
  submission: WritingSubmission,
  promptModel: string | undefined,
): Promise<{ modelName: string; generationConfig?: GenerationConfig }> {
  const rule = await prisma.aIModelRoutingRule.findFirst({
    where: {
      isActive: true,
      featureCode: "scoring",
      OR: [
        { planCode: user.subscriptionPlan, taskType: submission.taskType },
        { planCode: user.subscriptionPlan, taskType: null },
      ],
    },
    orderBy: { priority: "asc" },
  });

  if (rule) {
    return {
      modelName: rule.modelName,
      generationConfig: (rule.generationConfig as GenerationConfig) ?? undefined,
    };
  }
  return { modelName: promptModel || env.geminiDefaultModel };
}

export async function scoreSubmission(
  submission: WritingSubmission,
  user: User,
): Promise<ScoringResultSummary> {
  const provider = "gemini";

  await prisma.writingSubmission.update({
    where: { id: submission.id },
    data: { status: "PROCESSING" },
  });

  // 1. Select active prompt.
  const prompt = await getActivePrompt(submission.taskType);
  if (!prompt) {
    await markFailed(submission.id);
    return {
      status: "FAILED",
      errorMessage: "No active scoring prompt is configured.",
    };
  }

  // 2. Resolve model + generation config.
  const { modelName, generationConfig } = await resolveModel(
    user,
    submission,
    prompt.modelName,
  );
  const genConfig: GenerationConfig = {
    temperature: 0.2,
    topP: 0.8,
    topK: 40,
    maxOutputTokens: 8192,
    responseMimeType: "application/json",
    ...((prompt.generationConfig as GenerationConfig) ?? {}),
    ...(generationConfig ?? {}),
  };

  // 3. Render the prompt. Student content is wrapped by delimiters in the
  //    template; the system instruction tells the model to treat it as data.
  const userPrompt = renderTemplate(prompt.userPromptTemplate, {
    task_type: submission.taskType,
    question_prompt: submission.questionPrompt,
    student_essay: submission.essayText,
    word_count: submission.wordCount,
  });

  const ai = getProvider(provider);

  try {
    // 4. Call the model.
    const aiResult = await ai.scoreWriting({
      modelName,
      systemInstruction: prompt.systemInstruction,
      userPrompt,
      generationConfig: genConfig,
    });

    const cost = await resolveCost(provider, modelName, aiResult.usage);

    // 5. Parse + validate (one repair attempt).
    const { value, repaired } = parseModelJson(aiResult.rawText);
    const parsed = value === null ? null : scoringOutputSchema.safeParse(value);

    if (!parsed || !parsed.success) {
      await logUsage({
        userId: user.id,
        submissionId: submission.id,
        provider,
        modelName,
        promptId: prompt.id,
        promptVersion: prompt.version,
        usage: aiResult.usage,
        cost,
        latencyMs: aiResult.latencyMs,
        status: "SUCCESS", // the model responded; output was just unusable
        errorCode: "INVALID_OUTPUT",
        errorMessage: "AI output failed schema validation",
        requestId: aiResult.requestId,
      });
      await persistInvalidResult(submission.id, aiResult.rawText, {
        provider,
        modelName,
        promptId: prompt.id,
        promptVersion: prompt.version,
      });
      await markFailed(submission.id);
      return {
        status: "FAILED",
        errorMessage:
          "We couldn't read the AI response. Please try submitting again.",
      };
    }

    const output: ScoringOutput = parsed.data;

    // 6. Recompute scores server-side.
    const scores = normalizeScores(output, submission.taskType);

    // 7. Persist result + error corrections + usage + status (transaction).
    const scoringResultId = await prisma.$transaction(async (tx) => {
      const result = await tx.scoringResult.create({
        data: {
          submissionId: submission.id,
          provider,
          modelName,
          promptId: prompt.id,
          promptVersion: prompt.version,
          overallBand: scores.overallBand,
          overallBandRaw: scores.overallBandRaw,
          taskAchievementScore: scores.taskAchievementScore,
          taskResponseScore: scores.taskResponseScore,
          coherenceAndCohesionScore: scores.coherenceAndCohesionScore,
          lexicalResourceScore: scores.lexicalResourceScore,
          grammaticalRangeAndAccuracyScore:
            scores.grammaticalRangeAndAccuracyScore,
          resultJson: output as unknown as Prisma.InputJsonValue,
          rawModelOutput: aiResult.rawText,
          validationStatus: repaired ? "REPAIRED" : "VALID",
          modelConfidence: output.model_confidence || null,
        },
      });

      if (output.error_corrections.length > 0) {
        await tx.errorCorrection.createMany({
          data: output.error_corrections.map((ec) => ({
            scoringResultId: result.id,
            criterion: ec.criterion || "",
            subcriterion: ec.subcriterion ?? null,
            tag: ec.tag,
            severity: severityFromString(ec.severity),
            paragraphIndex: ec.paragraph_index ?? null,
            sentenceIndex: ec.sentence_index ?? null,
            originalText: ec.original_text,
            correctedText: ec.corrected_text,
            explanation: ec.explanation,
            impactOnScore: ec.impact_on_score ?? null,
            suggestedLearningFocus: ec.suggested_learning_focus ?? null,
          })),
        });
      }

      await tx.writingSubmission.update({
        where: { id: submission.id },
        data: { status: "COMPLETED", completedAt: new Date() },
      });

      return result.id;
    });

    // 8. Log successful usage with cost.
    await logUsage({
      userId: user.id,
      submissionId: submission.id,
      scoringResultId,
      provider,
      modelName,
      promptId: prompt.id,
      promptVersion: prompt.version,
      usage: aiResult.usage,
      cost,
      latencyMs: aiResult.latencyMs,
      status: "SUCCESS",
      requestId: aiResult.requestId,
    });

    return { status: "COMPLETED", scoringResultId };
  } catch (err) {
    // Provider/system failure: log a failed usage row, mark submission FAILED.
    const isProviderError = err instanceof AIProviderError;
    await logUsage({
      userId: user.id,
      submissionId: submission.id,
      provider,
      modelName,
      promptId: prompt.id,
      promptVersion: prompt.version,
      usage: {
        inputTokens: 0,
        outputTokens: 0,
        cachedInputTokens: 0,
        thinkingTokens: 0,
        totalTokens: 0,
      },
      cost: {
        inputCostUsd: 0,
        outputCostUsd: 0,
        cachedCostUsd: 0,
        thinkingCostUsd: 0,
        totalCostUsd: 0,
        exchangeRateUsdVnd: 0,
        totalCostVnd: 0,
      },
      latencyMs: 0,
      status: "FAILED",
      errorCode: isProviderError ? (err as AIProviderError).errorClass : "UNKNOWN",
      errorMessage: err instanceof Error ? err.message : "Unknown error",
    });
    await markFailed(submission.id);
    return {
      status: "FAILED",
      errorMessage:
        "The scoring service is temporarily unavailable. Please try again shortly.",
    };
  }
}

async function markFailed(submissionId: string): Promise<void> {
  await prisma.writingSubmission.update({
    where: { id: submissionId },
    data: { status: "FAILED" },
  });
}

async function persistInvalidResult(
  submissionId: string,
  rawText: string,
  meta: {
    provider: string;
    modelName: string;
    promptId: string;
    promptVersion: string;
  },
): Promise<void> {
  // Save raw output for debugging even when validation fails (section 18).
  await prisma.scoringResult.create({
    data: {
      submissionId,
      provider: meta.provider,
      modelName: meta.modelName,
      promptId: meta.promptId,
      promptVersion: meta.promptVersion,
      overallBand: 0,
      overallBandRaw: 0,
      coherenceAndCohesionScore: 0,
      lexicalResourceScore: 0,
      grammaticalRangeAndAccuracyScore: 0,
      resultJson: {} as Prisma.InputJsonValue,
      rawModelOutput: rawText,
      validationStatus: "INVALID",
    },
  });
}
