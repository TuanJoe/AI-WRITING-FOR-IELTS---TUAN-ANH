import type { NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";
import { requirePermission } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db";
import { ok, handleApiError } from "@/lib/api/response";
import { getPageParams, pageMeta } from "@/lib/api/pagination";

export async function GET(req: NextRequest) {
  try {
    await requirePermission("audit.view");
    const sp = req.nextUrl.searchParams;
    const params = getPageParams(sp);

    const where: Prisma.AdminAuditLogWhereInput = {};
    const action = sp.get("action");
    if (action) where.action = action;

    const [rows, total] = await Promise.all([
      prisma.adminAuditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: params.skip,
        take: params.take,
        include: { admin: { select: { email: true } } },
      }),
      prisma.adminAuditLog.count({ where }),
    ]);

    return ok({ items: rows, meta: pageMeta(total, params) });
  } catch (err) {
    return handleApiError(err);
  }
}
