import type { NextRequest } from "next/server";
import { requirePermission } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db";
import { handleApiError } from "@/lib/api/response";
import { recordAudit } from "@/services/audit-service";
import { getRequestMeta } from "@/lib/api/request-meta";

function csvCell(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value);
  return `"${s.replace(/"/g, '""')}"`;
}

// Exports submissions as CSV. Export actions are audited (section 22).
export async function GET(req: NextRequest) {
  try {
    const admin = await requirePermission("submissions.export");
    const meta = getRequestMeta(req);

    const rows = await prisma.writingSubmission.findMany({
      orderBy: { createdAt: "desc" },
      take: 5000,
      select: {
        id: true,
        taskType: true,
        wordCount: true,
        status: true,
        createdAt: true,
        user: { select: { email: true, subscriptionPlan: true } },
        scoringResult: {
          select: {
            overallBand: true,
            modelName: true,
            promptVersion: true,
          },
        },
        usageLogs: {
          where: { status: "SUCCESS" },
          select: { totalTokens: true, totalCostUsd: true, totalCostVnd: true },
        },
      },
    });

    await recordAudit({
      adminUserId: admin.id,
      action: "EXPORT_SUBMISSIONS",
      entityType: "WritingSubmission",
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      afterValue: { count: rows.length },
    });

    const header = [
      "Submission ID",
      "User",
      "Plan",
      "Task Type",
      "Word Count",
      "Overall Band",
      "Model",
      "Prompt Version",
      "Total Tokens",
      "Cost USD",
      "Cost VND",
      "Status",
      "Created At",
    ];
    const lines = [header.map(csvCell).join(",")];
    for (const r of rows) {
      const tokens = r.usageLogs.reduce((a, u) => a + u.totalTokens, 0);
      const usd = r.usageLogs.reduce((a, u) => a + u.totalCostUsd, 0);
      const vnd = r.usageLogs.reduce((a, u) => a + u.totalCostVnd, 0);
      lines.push(
        [
          r.id,
          r.user.email,
          r.user.subscriptionPlan,
          r.taskType,
          r.wordCount,
          r.scoringResult?.overallBand ?? "",
          r.scoringResult?.modelName ?? "",
          r.scoringResult?.promptVersion ?? "",
          tokens,
          usd.toFixed(6),
          vnd.toFixed(2),
          r.status,
          r.createdAt.toISOString(),
        ]
          .map(csvCell)
          .join(","),
      );
    }

    return new Response(lines.join("\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="submissions-${Date.now()}.csv"`,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
