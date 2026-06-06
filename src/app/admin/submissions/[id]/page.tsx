import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { requirePermission } from "@/lib/auth/current-user";
import { hasPermission } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db";
import { recordAudit } from "@/services/audit-service";
import { StatCard } from "@/components/StatCard";
import { ScoreReport } from "@/components/report/ScoreReport";
import { AdminNotes } from "@/components/admin/AdminNotes";
import { formatUsd, formatVnd, formatDate } from "@/lib/format";

export default async function AdminSubmissionDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const admin = await requirePermission("submissions.viewAll");
  const { id } = await params;

  const submission = await prisma.writingSubmission.findUnique({
    where: { id },
    include: {
      user: { select: { email: true, name: true, role: true, subscriptionPlan: true } },
      scoringResult: { include: { errorCorrections: true } },
      usageLogs: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!submission) notFound();

  const canSeeRaw = hasPermission(admin.role, "submissions.viewRawEssay");
  // Viewing raw essay content is audited (section 22).
  if (canSeeRaw) {
    const h = await headers();
    await recordAudit({
      adminUserId: admin.id,
      action: "VIEW_RAW_ESSAY",
      entityType: "WritingSubmission",
      entityId: submission.id,
      ipAddress: h.get("x-forwarded-for"),
      userAgent: h.get("user-agent"),
    });
  }

  const usage = submission.usageLogs[0];
  const sr = submission.scoringResult;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link href="/admin/submissions" className="text-sm text-brand-600">
        ← Back to submissions
      </Link>

      {/* User + meta */}
      <div className="card p-5">
        <h1 className="text-lg font-semibold text-slate-900">
          Submission {submission.id.slice(0, 8)}
        </h1>
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-4">
          <div>
            <dt className="text-xs uppercase text-slate-500">User</dt>
            <dd>{submission.user.email}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-slate-500">Plan / Role</dt>
            <dd>
              {submission.user.subscriptionPlan} · {submission.user.role}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-slate-500">Task</dt>
            <dd>{submission.taskType.replace("_", " ")}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-slate-500">Created</dt>
            <dd>{formatDate(submission.createdAt)}</dd>
          </div>
        </dl>
      </div>

      {/* Token / cost / model panels */}
      {usage && (
        <div className="grid gap-4 sm:grid-cols-4">
          <StatCard label="Input tokens" value={usage.inputTokens} />
          <StatCard label="Output tokens" value={usage.outputTokens} />
          <StatCard label="Cost USD" value={formatUsd(usage.totalCostUsd)} />
          <StatCard label="Cost VND" value={formatVnd(usage.totalCostVnd)} />
          <StatCard label="Model" value={usage.modelName} />
          <StatCard label="Prompt" value={usage.promptVersion ?? "—"} />
          <StatCard label="Latency" value={`${usage.latencyMs} ms`} />
          <StatCard label="Status" value={usage.status} />
        </div>
      )}

      {/* Question + essay */}
      <div className="card p-5">
        <h2 className="mb-2 font-semibold text-slate-900">Question prompt</h2>
        <p className="whitespace-pre-wrap text-sm text-slate-700">
          {submission.questionPrompt}
        </p>
        <h2 className="mb-2 mt-4 font-semibold text-slate-900">Essay</h2>
        <p className="whitespace-pre-wrap font-serif text-sm leading-relaxed text-slate-700">
          {canSeeRaw
            ? submission.essayText
            : "[redacted — insufficient permissions]"}
        </p>
      </div>

      {/* Full scoring report */}
      {sr && sr.validationStatus !== "INVALID" && (
        <ScoreReport
          data={{
            taskType: submission.taskType,
            overallBand: sr.overallBand,
            overallBandRaw: sr.overallBandRaw,
            taskAchievementScore: sr.taskAchievementScore,
            taskResponseScore: sr.taskResponseScore,
            coherenceAndCohesionScore: sr.coherenceAndCohesionScore,
            lexicalResourceScore: sr.lexicalResourceScore,
            grammaticalRangeAndAccuracyScore: sr.grammaticalRangeAndAccuracyScore,
            modelConfidence: sr.modelConfidence,
            resultJson: sr.resultJson,
            errorCorrections: sr.errorCorrections,
          }}
        />
      )}

      {/* Raw Gemini JSON (section 19.2 #15) */}
      {sr && (
        <details className="card p-5">
          <summary className="cursor-pointer font-semibold text-slate-900">
            Raw model output ({sr.validationStatus})
          </summary>
          <pre className="mt-3 max-h-96 overflow-auto rounded-lg bg-slate-900 p-4 text-xs text-slate-100">
            {sr.rawModelOutput}
          </pre>
        </details>
      )}

      {/* Error logs */}
      {submission.usageLogs.some((u) => u.status === "FAILED") && (
        <div className="card p-5">
          <h2 className="mb-2 font-semibold text-slate-900">Error logs</h2>
          <ul className="space-y-1 text-sm text-red-700">
            {submission.usageLogs
              .filter((u) => u.status === "FAILED")
              .map((u) => (
                <li key={u.id}>
                  [{u.errorCode}] {u.errorMessage}
                </li>
              ))}
          </ul>
        </div>
      )}

      {/* Admin notes */}
      <div className="card p-5">
        <h2 className="mb-2 font-semibold text-slate-900">Admin notes</h2>
        <AdminNotes submissionId={submission.id} initial={submission.adminNotes ?? ""} />
      </div>
    </div>
  );
}
