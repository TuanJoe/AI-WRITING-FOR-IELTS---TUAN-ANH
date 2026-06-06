import type { NextRequest } from "next/server";
import { requirePermission } from "@/lib/auth/current-user";
import { ok, handleApiError } from "@/lib/api/response";
import { clonePrompt } from "@/services/prompt-service";
import { recordAudit } from "@/services/audit-service";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await requirePermission("prompts.manage");
    const { id } = await params;
    const clone = await clonePrompt(id, admin.id);
    await recordAudit({
      adminUserId: admin.id,
      action: "CLONE_PROMPT",
      entityType: "AIPrompt",
      entityId: clone.id,
      beforeValue: { sourceId: id },
      afterValue: { version: clone.version },
    });
    return ok(clone, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
