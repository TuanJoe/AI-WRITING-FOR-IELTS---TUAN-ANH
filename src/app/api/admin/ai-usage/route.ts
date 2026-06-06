import type { NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";
import { requirePermission } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db";
import { ok, handleApiError } from "@/lib/api/response";
import { getPageParams, pageMeta } from "@/lib/api/pagination";

// AI usage log list (section 19.4).
export async function GET(req: NextRequest) {
  try {
    await requirePermission("finance.view");
    const sp = req.nextUrl.searchParams;
    const params = getPageParams(sp);

    const where: Prisma.AIUsageLogWhereInput = {};
    const status = sp.get("status");
    const modelName = sp.get("modelName");
    if (status === "SUCCESS" || status === "FAILED") where.status = status;
    if (modelName) where.modelName = modelName;

    const [rows, total] = await Promise.all([
      prisma.aIUsageLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: params.skip,
        take: params.take,
        include: { user: { select: { email: true } } },
      }),
      prisma.aIUsageLog.count({ where }),
    ]);

    return ok({ items: rows, meta: pageMeta(total, params) });
  } catch (err) {
    return handleApiError(err);
  }
}
