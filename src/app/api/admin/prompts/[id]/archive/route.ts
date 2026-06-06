import type { NextRequest } from "next/server";
import { requirePermission } from "@/lib/auth/current-user";
import { ok, handleApiError } from "@/lib/api/response";
import { archivePrompt, getPrompt } from "@/services/prompt-service";
import { recordAudit } from "@/services/audit-service";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await requirePermission("prompts.publish");
    const { id } = await params;
    const before = await getPrompt(id);
    const prompt = await archivePrompt(id, admin.id);
    await recordAudit({
      adminUserId: admin.id,
      action: "ARCHIVE_PROMPT",
      entityType: "AIPrompt",
      entityId: id,
      beforeValue: { status: before?.status },
      afterValue: { status: prompt.status },
    });
    return ok(prompt);
  } catch (err) {
    return handleApiError(err);
  }
}
