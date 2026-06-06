import type { NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";
import { requirePermission } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db";
import { ok, handleApiError } from "@/lib/api/response";
import { getPageParams, pageMeta } from "@/lib/api/pagination";

// Admin submission list with filters (section 19.2).
export async function GET(req: NextRequest) {
  try {
    await requirePermission("submissions.viewAll");
    const sp = req.nextUrl.searchParams;
    const params = getPageParams(sp);

    const where: Prisma.WritingSubmissionWhereInput = {};
    const taskType = sp.get("taskType");
    const status = sp.get("status");
    const userEmail = sp.get("userEmail");
    const from = sp.get("from");
    const to = sp.get("to");

    if (taskType === "TASK_1" || taskType === "TASK_2") where.taskType = taskType;
    if (status) where.status = status as Prisma.WritingSubmissionWhereInput["status"];
    if (userEmail)
      where.user = { email: { contains: userEmail, mode: "insensitive" } };
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    const bandMin = sp.get("bandMin");
    const bandMax = sp.get("bandMax");
    const modelName = sp.get("modelName");
    const promptVersion = sp.get("promptVersion");
    if (bandMin || bandMax || modelName || promptVersion) {
      where.scoringResult = {};
      if (bandMin || bandMax) {
        where.scoringResult.overallBand = {};
        if (bandMin) where.scoringResult.overallBand.gte = parseFloat(bandMin);
        if (bandMax) where.scoringResult.overallBand.lte = parseFloat(bandMax);
      }
      if (modelName) where.scoringResult.modelName = modelName;
      if (promptVersion) where.scoringResult.promptVersion = promptVersion;
    }

    const [rows, total] = await Promise.all([
      prisma.writingSubmission.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: params.skip,
        take: params.take,
        select: {
          id: true,
          taskType: true,
          wordCount: true,
          status: true,
          createdAt: true,
          user: { select: { email: true, subscriptionPlan: true } },
          scoringResult: {
            select: {
              overallBand: true,
              taskAchievementScore: true,
              taskResponseScore: true,
              coherenceAndCohesionScore: true,
              lexicalResourceScore: true,
              grammaticalRangeAndAccuracyScore: true,
              modelName: true,
              promptVersion: true,
            },
          },
          usageLogs: {
            where: { status: "SUCCESS" },
            select: {
              inputTokens: true,
              outputTokens: true,
              totalTokens: true,
              totalCostUsd: true,
              totalCostVnd: true,
            },
          },
        },
      }),
      prisma.writingSubmission.count({ where }),
    ]);

    const items = rows.map((r) => {
      const usage = r.usageLogs.reduce(
        (acc, u) => ({
          inputTokens: acc.inputTokens + u.inputTokens,
          outputTokens: acc.outputTokens + u.outputTokens,
          totalTokens: acc.totalTokens + u.totalTokens,
          totalCostUsd: acc.totalCostUsd + u.totalCostUsd,
          totalCostVnd: acc.totalCostVnd + u.totalCostVnd,
        }),
        { inputTokens: 0, outputTokens: 0, totalTokens: 0, totalCostUsd: 0, totalCostVnd: 0 },
      );
      const { usageLogs, ...rest } = r;
      void usageLogs;
      return { ...rest, usage };
    });

    return ok({ items, meta: pageMeta(total, params) });
  } catch (err) {
    return handleApiError(err);
  }
}
