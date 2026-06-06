import type { NextRequest } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db";
import { ok, handleApiError } from "@/lib/api/response";
import { recordAudit } from "@/services/audit-service";

export async function GET() {
  try {
    await requirePermission("finance.view");
    const rows = await prisma.exchangeRate.findMany({
      orderBy: { effectiveDate: "desc" },
      take: 100,
    });
    return ok(rows);
  } catch (err) {
    return handleApiError(err);
  }
}

const createSchema = z.object({
  baseCurrency: z.string().default("USD"),
  targetCurrency: z.string().default("VND"),
  rate: z.number().positive(),
  source: z.string().optional(),
  effectiveDate: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const admin = await requirePermission("pricing.manage");
    const input = createSchema.parse(await req.json());
    const created = await prisma.exchangeRate.create({
      data: {
        baseCurrency: input.baseCurrency,
        targetCurrency: input.targetCurrency,
        rate: input.rate,
        source: input.source ?? "manual",
        effectiveDate: input.effectiveDate
          ? new Date(input.effectiveDate)
          : new Date(),
      },
    });
    await recordAudit({
      adminUserId: admin.id,
      action: "CREATE_EXCHANGE_RATE",
      entityType: "ExchangeRate",
      entityId: created.id,
      afterValue: created,
    });
    return ok(created, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
