import { requirePermission } from "@/lib/auth/current-user";
import { ok, handleApiError } from "@/lib/api/response";
import { getErrorBreakdown } from "@/services/usage-analytics-service";

export async function GET() {
  try {
    await requirePermission("finance.view");
    return ok(await getErrorBreakdown());
  } catch (err) {
    return handleApiError(err);
  }
}
