import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db";
import { Badge } from "@/components/Badge";
import { statusColor, formatDate } from "@/lib/format";
import { ScoreReport } from "@/components/report/ScoreReport";

export default async function SubmissionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;

  const submission = await prisma.writingSubmission.findUnique({
    where: { id },
    include: { scoringResult: { include: { errorCorrections: true } } },
  });

  if (!submission || submission.userId !== user.id) notFound();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <Link href="/submissions" className="text-sm text-brand-600">
          ← Back to history
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold text-slate-900">
            {submission.taskType.replace("_", " ")} result
          </h1>
          <Badge className={statusColor(submission.status)}>
            {submission.status}
          </Badge>
          <span className="text-sm text-slate-400">
            {formatDate(submission.createdAt)} · {submission.wordCount} words
          </span>
        </div>
      </div>

      {/* Question + essay */}
      <details className="card p-5" open>
        <summary className="cursor-pointer font-semibold text-slate-900">
          Question & your essay
        </summary>
        <div className="mt-3 space-y-3">
          <div>
            <h3 className="text-xs font-semibold uppercase text-slate-500">
              Question prompt
            </h3>
            <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">
              {submission.questionPrompt}
            </p>
          </div>
          <div>
            <h3 className="text-xs font-semibold uppercase text-slate-500">
              Your essay
            </h3>
            <p className="mt-1 whitespace-pre-wrap font-serif text-sm leading-relaxed text-slate-700">
              {submission.essayText}
            </p>
          </div>
        </div>
      </details>

      {submission.status === "FAILED" && (
        <div className="card border-red-200 bg-red-50 p-6 text-center">
          <h2 className="text-lg font-semibold text-red-800">
            Scoring failed
          </h2>
          <p className="mt-1 text-sm text-red-700">
            We couldn&apos;t score this essay. This didn&apos;t count against
            your quota — please try submitting again.
          </p>
          <Link href="/writing/new" className="btn-primary mt-4">
            Try again
          </Link>
        </div>
      )}

      {(submission.status === "PENDING" ||
        submission.status === "PROCESSING") && (
        <div className="card p-10 text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
          <p className="mt-4 text-sm text-slate-500">
            Scoring in progress… refresh in a moment.
          </p>
        </div>
      )}

      {submission.status === "COMPLETED" && submission.scoringResult && (
        <ScoreReport
          data={{
            taskType: submission.taskType,
            overallBand: submission.scoringResult.overallBand,
            overallBandRaw: submission.scoringResult.overallBandRaw,
            taskAchievementScore: submission.scoringResult.taskAchievementScore,
            taskResponseScore: submission.scoringResult.taskResponseScore,
            coherenceAndCohesionScore:
              submission.scoringResult.coherenceAndCohesionScore,
            lexicalResourceScore: submission.scoringResult.lexicalResourceScore,
            grammaticalRangeAndAccuracyScore:
              submission.scoringResult.grammaticalRangeAndAccuracyScore,
            modelConfidence: submission.scoringResult.modelConfidence,
            resultJson: submission.scoringResult.resultJson,
            errorCorrections: submission.scoringResult.errorCorrections,
          }}
        />
      )}
    </div>
  );
}
