import type { NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";
import { requirePermission } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db";
import { ok, handleApiError } from "@/lib/api/response";
import { getPageParams, pageMeta } from "@/lib/api/pagination";

export async function GET(req: NextRequest) {
  try {
    await requirePermission("users.manage");
    const sp = req.nextUrl.searchParams;
    const params = getPageParams(sp);
    const search = sp.get("search");

    const where: Prisma.UserWhereInput = search
      ? { email: { contains: search, mode: "insensitive" } }
      : {};

    const [rows, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: params.skip,
        take: params.take,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          subscriptionPlan: true,
          dailyQuota: true,
          monthlyQuota: true,
          isActive: true,
          createdAt: true,
          lastLoginAt: true,
          _count: { select: { submissions: true } },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return ok({ items: rows, meta: pageMeta(total, params) });
  } catch (err) {
    return handleApiError(err);
  }
}
