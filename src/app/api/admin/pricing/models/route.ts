import type { NextRequest } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db";
import { ok, handleApiError } from "@/lib/api/response";
import { recordAudit } from "@/services/audit-service";

export async function GET() {
  try {
    await requirePermission("finance.view");
    const rows = await prisma.aIModelPricing.findMany({
      orderBy: [{ provider: "asc" }, { modelName: "asc" }, { effectiveFrom: "desc" }],
    });
    return ok(rows);
  } catch (err) {
    return handleApiError(err);
  }
}

const createSchema = z.object({
  provider: z.string().min(1).default("gemini"),
  modelName: z.string().min(1),
  currency: z.string().default("USD"),
  inputPricePer1mTokens: z.number().nonnegative(),
  outputPricePer1mTokens: z.number().nonnegative(),
  cachedInputPricePer1mTokens: z.number().nonnegative().default(0),
  effectiveFrom: z.string().optional(),
  sourceUrl: z.string().url().optional(),
});

// New pricing is added as a new effective-dated row — historical cost records
// are never mutated (section 19.5).
export async function POST(req: NextRequest) {
  try {
    const admin = await requirePermission("pricing.manage");
    const input = createSchema.parse(await req.json());
    const effectiveFrom = input.effectiveFrom
      ? new Date(input.effectiveFrom)
      : new Date();

    const created = await prisma.$transaction(async (tx) => {
      // Close out the previous open-ended price for this model.
      await tx.aIModelPricing.updateMany({
        where: {
          provider: input.provider,
          modelName: input.modelName,
          effectiveTo: null,
        },
        data: { effectiveTo: effectiveFrom },
      });
      return tx.aIModelPricing.create({
        data: {
          provider: input.provider,
          modelName: input.modelName,
          currency: input.currency,
          inputPricePer1mTokens: input.inputPricePer1mTokens,
          outputPricePer1mTokens: input.outputPricePer1mTokens,
          cachedInputPricePer1mTokens: input.cachedInputPricePer1mTokens,
          effectiveFrom,
          sourceUrl: input.sourceUrl,
          createdBy: admin.id,
        },
      });
    });

    await recordAudit({
      adminUserId: admin.id,
      action: "CREATE_PRICING",
      entityType: "AIModelPricing",
      entityId: created.id,
      afterValue: created,
    });

    return ok(created, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
