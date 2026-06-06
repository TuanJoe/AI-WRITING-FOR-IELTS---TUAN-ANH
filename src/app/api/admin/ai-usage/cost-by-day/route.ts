import type { NextRequest } from "next/server";
import { requirePermission } from "@/lib/auth/current-user";
import { ok, handleApiError } from "@/lib/api/response";
import { getCostByDay } from "@/services/usage-analytics-service";

export async function GET(req: NextRequest) {
  try {
    await requirePermission("finance.view");
    const days = parseInt(req.nextUrl.searchParams.get("days") || "30", 10);
    return ok(await getCostByDay(Number.isNaN(days) ? 30 : days));
  } catch (err) {
    return handleApiError(err);
  }
}
