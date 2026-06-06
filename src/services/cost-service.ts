import type { AIModelPricing } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { TokenUsage } from "@/lib/ai/types";

// Cost calculation (section 9). Prices are NEVER hard-coded — they come from the
// AIModelPricing table, selected by the request timestamp, and converted to VND
// using the latest active exchange rate.

export interface CostBreakdown {
  inputCostUsd: number;
  outputCostUsd: number;
  cachedCostUsd: number;
  thinkingCostUsd: number;
  totalCostUsd: number;
  exchangeRateUsdVnd: number;
  totalCostVnd: number;
}

/** Find the pricing row whose effective window contains `at`. */
export async function getPricingForModel(
  provider: string,
  modelName: string,
  at: Date = new Date(),
): Promise<AIModelPricing | null> {
  return prisma.aIModelPricing.findFirst({
    where: {
      provider,
      modelName,
      effectiveFrom: { lte: at },
      OR: [{ effectiveTo: null }, { effectiveTo: { gte: at } }],
    },
    orderBy: { effectiveFrom: "desc" },
  });
}

/** Latest active USD->VND rate (or 0 if none configured). */
export async function getLatestExchangeRate(
  baseCurrency = "USD",
  targetCurrency = "VND",
): Promise<number> {
  const row = await prisma.exchangeRate.findFirst({
    where: { baseCurrency, targetCurrency },
    orderBy: { effectiveDate: "desc" },
  });
  return row?.rate ?? 0;
}

export function calculateCost(
  usage: TokenUsage,
  pricing: AIModelPricing | null,
  exchangeRate: number,
): CostBreakdown {
  const inPrice = pricing?.inputPricePer1mTokens ?? 0;
  const outPrice = pricing?.outputPricePer1mTokens ?? 0;
  const cachedPrice = pricing?.cachedInputPricePer1mTokens ?? 0;

  const inputCostUsd = (usage.inputTokens / 1_000_000) * inPrice;
  const outputCostUsd = (usage.outputTokens / 1_000_000) * outPrice;
  const cachedCostUsd = (usage.cachedInputTokens / 1_000_000) * cachedPrice;
  // Thinking tokens are billed at the output rate by Gemini.
  const thinkingCostUsd = (usage.thinkingTokens / 1_000_000) * outPrice;

  const totalCostUsd =
    inputCostUsd + outputCostUsd + cachedCostUsd + thinkingCostUsd;
  const totalCostVnd = totalCostUsd * exchangeRate;

  return {
    inputCostUsd,
    outputCostUsd,
    cachedCostUsd,
    thinkingCostUsd,
    totalCostUsd,
    exchangeRateUsdVnd: exchangeRate,
    totalCostVnd,
  };
}

/** Convenience: resolve pricing + rate and compute the full breakdown. */
export async function resolveCost(
  provider: string,
  modelName: string,
  usage: TokenUsage,
  at: Date = new Date(),
): Promise<CostBreakdown> {
  const [pricing, rate] = await Promise.all([
    getPricingForModel(provider, modelName, at),
    getLatestExchangeRate(),
  ]);
  return calculateCost(usage, pricing, rate);
}
