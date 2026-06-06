import type { NextRequest } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db";
import { ok, handleApiError } from "@/lib/api/response";
import { recordAudit } from "@/services/audit-service";

const patchSchema = z.object({
  inputPricePer1mTokens: z.number().nonnegative().optional(),
  outputPricePer1mTokens: z.number().nonnegative().optional(),
  cachedInputPricePer1mTokens: z.number().nonnegative().optional(),
  effectiveTo: z.string().nullable().optional(),
  sourceUrl: z.string().url().nullable().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await requirePermission("pricing.manage");
    const { id } = await params;
    const input = patchSchema.parse(await req.json());
    const before = await prisma.aIModelPricing.findUnique({ where: { id } });

    const updated = await prisma.aIModelPricing.update({
      where: { id },
      data: {
        inputPricePer1mTokens: input.inputPricePer1mTokens,
        outputPricePer1mTokens: input.outputPricePer1mTokens,
        cachedInputPricePer1mTokens: input.cachedInputPricePer1mTokens,
        effectiveTo:
          input.effectiveTo === undefined
            ? undefined
            : input.effectiveTo
              ? new Date(input.effectiveTo)
              : null,
        sourceUrl: input.sourceUrl === undefined ? undefined : input.sourceUrl,
      },
    });

    await recordAudit({
      adminUserId: admin.id,
      action: "EDIT_PRICING",
      entityType: "AIModelPricing",
      entityId: id,
      beforeValue: before,
      afterValue: updated,
    });

    return ok(updated);
  } catch (err) {
    return handleApiError(err);
  }
}
