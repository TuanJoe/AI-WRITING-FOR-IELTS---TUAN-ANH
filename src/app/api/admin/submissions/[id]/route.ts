import type { NextRequest } from "next/server";
import { requirePermission } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db";
import { ok, fail, handleApiError } from "@/lib/api/response";
import { hasPermission } from "@/lib/auth/rbac";
import { recordAudit } from "@/services/audit-service";
import { getRequestMeta } from "@/lib/api/request-meta";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await requirePermission("submissions.viewAll");
    const { id } = await params;

    const submission = await prisma.writingSubmission.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            subscriptionPlan: true,
          },
        },
        scoringResult: { include: { errorCorrections: true } },
        usageLogs: { orderBy: { createdAt: "desc" } },
      },
    });
    if (!submission) return fail("Submission not found.", 404);

    // Accessing raw essay content is a sensitive action — audit it (section 22).
    if (hasPermission(admin.role, "submissions.viewRawEssay")) {
      const meta = getRequestMeta(req);
      await recordAudit({
        adminUserId: admin.id,
        action: "VIEW_RAW_ESSAY",
        entityType: "WritingSubmission",
        entityId: submission.id,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
      });
    } else {
      // Roles without raw-essay rights get a redacted essay.
      submission.essayText = "[redacted — insufficient permissions]";
    }

    return ok(submission);
  } catch (err) {
    return handleApiError(err);
  }
}

// Update admin notes on a submission.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await requirePermission("submissions.viewAll");
    const { id } = await params;
    const body = await req.json();
    const adminNotes = typeof body.adminNotes === "string" ? body.adminNotes : "";
    const updated = await prisma.writingSubmission.update({
      where: { id },
      data: { adminNotes },
    });
    await recordAudit({
      adminUserId: admin.id,
      action: "UPDATE_USER",
      entityType: "WritingSubmission",
      entityId: id,
      afterValue: { adminNotes },
    });
    return ok({ id: updated.id, adminNotes: updated.adminNotes });
  } catch (err) {
    return handleApiError(err);
  }
}
