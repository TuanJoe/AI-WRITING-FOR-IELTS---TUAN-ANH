import type { NextRequest } from "next/server";
import { requirePermission } from "@/lib/auth/current-user";
import { ok, handleApiError } from "@/lib/api/response";
import { getPrompt, rollbackPrompt } from "@/services/prompt-service";
import { recordAudit } from "@/services/audit-service";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await requirePermission("prompts.publish");
    const { id } = await params;
    const before = await getPrompt(id);
    const prompt = await rollbackPrompt(id, admin.id);
    await recordAudit({
      adminUserId: admin.id,
      action: "ROLLBACK_PROMPT",
      entityType: "AIPrompt",
      entityId: id,
      beforeValue: { status: before?.status },
      afterValue: { status: prompt.status, version: prompt.version },
    });
    return ok(prompt);
  } catch (err) {
    return handleApiError(err);
  }
}
