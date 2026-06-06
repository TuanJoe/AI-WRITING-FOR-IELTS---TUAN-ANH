import type { Prisma, UsageStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { TokenUsage } from "@/lib/ai/types";
import type { CostBreakdown } from "@/services/cost-service";

// Persists every AI request/response outcome (sections 4, 8). Both successful
// and failed calls are logged for analytics and debugging.

export interface LogUsageInput {
  userId?: string | null;
  submissionId?: string | null;
  scoringResultId?: string | null;
  provider: string;
  modelName: string;
  promptId?: string | null;
  promptVersion?: string | null;
  usage: TokenUsage;
  cost: CostBreakdown;
  latencyMs: number;
  status: UsageStatus;
  errorCode?: string | null;
  errorMessage?: string | null;
  requestId?: string | null;
}

export async function logUsage(input: LogUsageInput) {
  const data: Prisma.AIUsageLogCreateInput = {
    user: input.userId ? { connect: { id: input.userId } } : undefined,
    submission: input.submissionId
      ? { connect: { id: input.submissionId } }
      : undefined,
    scoringResultId: input.scoringResultId ?? undefined,
    provider: input.provider,
    modelName: input.modelName,
    promptId: input.promptId ?? undefined,
    promptVersion: input.promptVersion ?? undefined,
    inputTokens: input.usage.inputTokens,
    outputTokens: input.usage.outputTokens,
    cachedInputTokens: input.usage.cachedInputTokens,
    thinkingTokens: input.usage.thinkingTokens,
    totalTokens: input.usage.totalTokens,
    inputCostUsd: input.cost.inputCostUsd,
    outputCostUsd: input.cost.outputCostUsd,
    cachedCostUsd: input.cost.cachedCostUsd,
    thinkingCostUsd: input.cost.thinkingCostUsd,
    totalCostUsd: input.cost.totalCostUsd,
    exchangeRateUsdVnd: input.cost.exchangeRateUsdVnd,
    totalCostVnd: input.cost.totalCostVnd,
    latencyMs: input.latencyMs,
    status: input.status,
    errorCode: input.errorCode ?? undefined,
    errorMessage: input.errorMessage ?? undefined,
    requestId: input.requestId ?? undefined,
  };
  return prisma.aIUsageLog.create({ data });
}
