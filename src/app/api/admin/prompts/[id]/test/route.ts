import type { NextRequest } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db";
import { ok, fail, handleApiError } from "@/lib/api/response";
import { getPrompt } from "@/services/prompt-service";
import { getProvider, type GenerationConfig } from "@/lib/ai";
import { renderTemplate } from "@/lib/prompts/render";
import { parseModelJson } from "@/lib/ai/json-repair";
import { scoringOutputSchema } from "@/lib/validation/scoring-schema";
import { resolveCost } from "@/services/cost-service";
import { recordAudit } from "@/services/audit-service";

const testSchema = z.object({
  testName: z.string().optional(),
  taskType: z.enum(["TASK_1", "TASK_2"]),
  questionPrompt: z.string().min(1),
  essayText: z.string().min(1),
  expectedScore: z.number().optional(),
});

// Run a prompt against ad-hoc input and record the result (section 19.3).
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await requirePermission("prompts.manage");
    const { id } = await params;
    const prompt = await getPrompt(id);
    if (!prompt) return fail("Prompt not found.", 404);

    const input = testSchema.parse(await req.json());

    const userPrompt = renderTemplate(prompt.userPromptTemplate, {
      task_type: input.taskType,
      question_prompt: input.questionPrompt,
      student_essay: input.essayText,
      word_count: input.essayText.trim().split(/\s+/).length,
    });

    const ai = getProvider(prompt.modelProvider);
    const result = await ai.testPrompt({
      modelName: prompt.modelName,
      systemInstruction: prompt.systemInstruction,
      userPrompt,
      generationConfig: (prompt.generationConfig as GenerationConfig) ?? undefined,
    });

    const cost = await resolveCost(prompt.modelProvider, prompt.modelName, result.usage);
    const { value } = parseModelJson(result.rawText);
    const parsed = value === null ? null : scoringOutputSchema.safeParse(value);
    const actualScore =
      parsed && parsed.success ? parsed.data.overall_band : null;
    const scoreDiff =
      actualScore !== null && input.expectedScore !== undefined
        ? Math.round((actualScore - input.expectedScore) * 100) / 100
        : null;

    const testRun = await prisma.promptTestRun.create({
      data: {
        promptId: id,
        testName: input.testName,
        inputPayload: {
          taskType: input.taskType,
          questionPrompt: input.questionPrompt,
          essayText: input.essayText,
        },
        outputPayload: parsed && parsed.success ? (parsed.data as object) : { raw: result.rawText },
        expectedScore: input.expectedScore,
        actualScore: actualScore ?? undefined,
        scoreDiff: scoreDiff ?? undefined,
        inputTokens: result.usage.inputTokens,
        outputTokens: result.usage.outputTokens,
        totalTokens: result.usage.totalTokens,
        estimatedCostUsd: cost.totalCostUsd,
        estimatedCostVnd: cost.totalCostVnd,
        latencyMs: result.latencyMs,
        status: parsed && parsed.success ? "SUCCESS" : "INVALID_OUTPUT",
        createdBy: admin.id,
      },
    });

    await recordAudit({
      adminUserId: admin.id,
      action: "TEST_PROMPT",
      entityType: "AIPrompt",
      entityId: id,
      afterValue: { testRunId: testRun.id, actualScore },
    });

    return ok({
      testRunId: testRun.id,
      actualScore,
      scoreDiff,
      valid: parsed ? parsed.success : false,
      usage: result.usage,
      latencyMs: result.latencyMs,
      costUsd: cost.totalCostUsd,
      costVnd: cost.totalCostVnd,
      output: parsed && parsed.success ? parsed.data : null,
      rawText: result.rawText,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
