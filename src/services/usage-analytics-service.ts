import { prisma } from "@/lib/db";

// Aggregations powering the AI usage / cost dashboards (sections 19.1, 19.4).

export async function getUsageSummary() {
  const agg = await prisma.aIUsageLog.aggregate({
    _sum: {
      inputTokens: true,
      outputTokens: true,
      totalTokens: true,
      totalCostUsd: true,
      totalCostVnd: true,
    },
    _avg: { latencyMs: true },
    _count: true,
  });
  const failed = await prisma.aIUsageLog.count({ where: { status: "FAILED" } });
  const success = await prisma.aIUsageLog.count({
    where: { status: "SUCCESS" },
  });
  const total = success + failed;
  return {
    inputTokens: agg._sum.inputTokens ?? 0,
    outputTokens: agg._sum.outputTokens ?? 0,
    totalTokens: agg._sum.totalTokens ?? 0,
    totalCostUsd: agg._sum.totalCostUsd ?? 0,
    totalCostVnd: agg._sum.totalCostVnd ?? 0,
    averageLatencyMs: Math.round(agg._avg.latencyMs ?? 0),
    requests: agg._count,
    successCount: success,
    failedCount: failed,
    errorRate: total > 0 ? failed / total : 0,
    avgCostPerSuccessUsd:
      success > 0 ? (agg._sum.totalCostUsd ?? 0) / success : 0,
  };
}

export async function getCostByDay(days = 30) {
  const since = new Date();
  since.setDate(since.getDate() - days);
  // Raw SQL for date_trunc grouping (Postgres).
  const rows = await prisma.$queryRaw<
    { day: Date; cost_usd: number; cost_vnd: number; tokens: bigint }[]
  >`
    SELECT date_trunc('day', "createdAt") AS day,
           COALESCE(SUM("totalCostUsd"), 0) AS cost_usd,
           COALESCE(SUM("totalCostVnd"), 0) AS cost_vnd,
           COALESCE(SUM("totalTokens"), 0) AS tokens
    FROM "AIUsageLog"
    WHERE "createdAt" >= ${since}
    GROUP BY day
    ORDER BY day ASC
  `;
  return rows.map((r) => ({
    day: r.day.toISOString().slice(0, 10),
    costUsd: Number(r.cost_usd),
    costVnd: Number(r.cost_vnd),
    tokens: Number(r.tokens),
  }));
}

export async function getCostByModel() {
  const rows = await prisma.aIUsageLog.groupBy({
    by: ["modelName"],
    _sum: { totalCostUsd: true, totalCostVnd: true, totalTokens: true },
    _count: true,
    orderBy: { _sum: { totalCostUsd: "desc" } },
  });
  return rows.map((r) => ({
    modelName: r.modelName,
    costUsd: r._sum.totalCostUsd ?? 0,
    costVnd: r._sum.totalCostVnd ?? 0,
    tokens: r._sum.totalTokens ?? 0,
    requests: r._count,
  }));
}

export async function getCostByPrompt() {
  const rows = await prisma.aIUsageLog.groupBy({
    by: ["promptVersion"],
    _sum: { totalCostUsd: true, totalCostVnd: true },
    _count: true,
    where: { promptVersion: { not: null } },
    orderBy: { _sum: { totalCostUsd: "desc" } },
  });
  return rows.map((r) => ({
    promptVersion: r.promptVersion,
    costUsd: r._sum.totalCostUsd ?? 0,
    costVnd: r._sum.totalCostVnd ?? 0,
    requests: r._count,
  }));
}

export async function getErrorBreakdown() {
  const rows = await prisma.aIUsageLog.groupBy({
    by: ["errorCode", "modelName"],
    _count: true,
    where: { status: "FAILED" },
    orderBy: { _count: { errorCode: "desc" } },
  });
  return rows.map((r) => ({
    errorCode: r.errorCode ?? "UNKNOWN",
    modelName: r.modelName,
    count: r._count,
  }));
}
