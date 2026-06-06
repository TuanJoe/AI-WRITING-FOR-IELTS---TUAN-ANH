import type { NextRequest } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db";
import { ok, fail, handleApiError } from "@/lib/api/response";
import { recordAudit } from "@/services/audit-service";

const patchSchema = z.object({
  role: z
    .enum([
      "STUDENT",
      "TEACHER",
      "SUPPORT",
      "PRODUCT_ADMIN",
      "FINANCE_ADMIN",
      "SUPER_ADMIN",
    ])
    .optional(),
  subscriptionPlan: z.string().optional(),
  dailyQuota: z.number().int().nonnegative().optional(),
  monthlyQuota: z.number().int().nonnegative().optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await requirePermission("users.manage");
    const { id } = await params;
    const input = patchSchema.parse(await req.json());

    const before = await prisma.user.findUnique({ where: { id } });
    if (!before) return fail("User not found.", 404);

    // Only SUPER_ADMIN can change roles, to prevent privilege escalation.
    if (input.role && admin.role !== "SUPER_ADMIN") {
      return fail("Only a super admin can change roles.", 403);
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        role: input.role,
        subscriptionPlan: input.subscriptionPlan,
        dailyQuota: input.dailyQuota,
        monthlyQuota: input.monthlyQuota,
        isActive: input.isActive,
      },
    });

    // Determine the most specific audit action.
    let action: Parameters<typeof recordAudit>[0]["action"] = "UPDATE_USER";
    if (input.isActive === false) action = "BAN_USER";
    else if (
      input.dailyQuota !== undefined ||
      input.monthlyQuota !== undefined
    )
      action = "ADJUST_QUOTA";

    await recordAudit({
      adminUserId: admin.id,
      action,
      entityType: "User",
      entityId: id,
      beforeValue: {
        role: before.role,
        isActive: before.isActive,
        dailyQuota: before.dailyQuota,
        monthlyQuota: before.monthlyQuota,
        subscriptionPlan: before.subscriptionPlan,
      },
      afterValue: {
        role: updated.role,
        isActive: updated.isActive,
        dailyQuota: updated.dailyQuota,
        monthlyQuota: updated.monthlyQuota,
        subscriptionPlan: updated.subscriptionPlan,
      },
    });

    return ok({
      id: updated.id,
      role: updated.role,
      isActive: updated.isActive,
      dailyQuota: updated.dailyQuota,
      monthlyQuota: updated.monthlyQuota,
      subscriptionPlan: updated.subscriptionPlan,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
