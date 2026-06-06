import { requirePermission } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db";
import { ok, handleApiError } from "@/lib/api/response";

// Admin dashboard KPIs (section 19.1).
export async function GET() {
  try {
    await requirePermission("admin.access");

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [
      totalUsers,
      activeUsers,
      totalSubmissions,
      submissionsToday,
      failedJobs,
      bandAgg,
      latencyAgg,
      costToday,
      costMonth,
      tokenTotals,
      topUsers,
      topPrompts,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.writingSubmission.count(),
      prisma.writingSubmission.count({ where: { createdAt: { gte: startOfDay } } }),
      prisma.writingSubmission.count({ where: { status: "FAILED" } }),
      prisma.scoringResult.aggregate({ _avg: { overallBand: true } }),
      prisma.aIUsageLog.aggregate({
        _avg: { latencyMs: true },
        where: { status: "SUCCESS" },
      }),
      prisma.aIUsageLog.aggregate({
        _sum: { totalCostUsd: true, totalCostVnd: true },
        where: { createdAt: { gte: startOfDay } },
      }),
      prisma.aIUsageLog.aggregate({
        _sum: { totalCostUsd: true, totalCostVnd: true },
        where: { createdAt: { gte: startOfMonth } },
      }),
      prisma.aIUsageLog.aggregate({
        _sum: {
          inputTokens: true,
          outputTokens: true,
          totalCostUsd: true,
          totalCostVnd: true,
        },
      }),
      prisma.aIUsageLog.groupBy({
        by: ["userId"],
        _sum: { totalCostUsd: true },
        orderBy: { _sum: { totalCostUsd: "desc" } },
        take: 5,
        where: { userId: { not: null } },
      }),
      prisma.aIUsageLog.groupBy({
        by: ["promptVersion"],
        _sum: { totalCostUsd: true },
        orderBy: { _sum: { totalCostUsd: "desc" } },
        take: 5,
        where: { promptVersion: { not: null } },
      }),
    ]);

    // Resolve emails for top costly users.
    const userIds = topUsers.map((u) => u.userId).filter(Boolean) as string[];
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, email: true },
    });
    const emailById = new Map(users.map((u) => [u.id, u.email]));

    return ok({
      totalUsers,
      activeUsers,
      totalSubmissions,
      submissionsToday,
      failedJobs,
      averageBand: bandAgg._avg.overallBand
        ? Math.round(bandAgg._avg.overallBand * 100) / 100
        : 0,
      averageLatencyMs: Math.round(latencyAgg._avg.latencyMs ?? 0),
      costTodayUsd: costToday._sum.totalCostUsd ?? 0,
      costTodayVnd: costToday._sum.totalCostVnd ?? 0,
      costMonthUsd: costMonth._sum.totalCostUsd ?? 0,
      costMonthVnd: costMonth._sum.totalCostVnd ?? 0,
      totalInputTokens: tokenTotals._sum.inputTokens ?? 0,
      totalOutputTokens: tokenTotals._sum.outputTokens ?? 0,
      totalCostUsd: tokenTotals._sum.totalCostUsd ?? 0,
      totalCostVnd: tokenTotals._sum.totalCostVnd ?? 0,
      topCostlyUsers: topUsers.map((u) => ({
        userId: u.userId,
        email: u.userId ? emailById.get(u.userId) ?? "—" : "—",
        costUsd: u._sum.totalCostUsd ?? 0,
      })),
      topCostlyPrompts: topPrompts.map((p) => ({
        promptVersion: p.promptVersion,
        costUsd: p._sum.totalCostUsd ?? 0,
      })),
    });
  } catch (err) {
    return handleApiError(err);
  }
}
