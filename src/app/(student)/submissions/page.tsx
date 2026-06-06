import Link from "next/link";
import { requireUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db";
import { Badge } from "@/components/Badge";
import { bandColor, statusColor, formatDate } from "@/lib/format";

export default async function SubmissionHistoryPage() {
  const user = await requireUser();
  const submissions = await prisma.writingSubmission.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: { scoringResult: { select: { overallBand: true } } },
  });

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Submission history</h1>
        <Link href="/writing/new" className="btn-primary">
          + New Submission
        </Link>
      </div>

      {submissions.length === 0 ? (
        <div className="card p-10 text-center text-sm text-slate-500">
          You haven&apos;t submitted any essays yet.
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="th">Question</th>
                <th className="th">Task</th>
                <th className="th">Words</th>
                <th className="th">Band</th>
                <th className="th">Status</th>
                <th className="th">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {submissions.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="table-cell max-w-xs truncate">
                    <Link
                      href={`/submissions/${s.id}`}
                      className="font-medium text-brand-700"
                    >
                      {s.questionPrompt.slice(0, 60) || "Untitled"}
                    </Link>
                  </td>
                  <td className="table-cell">{s.taskType.replace("_", " ")}</td>
                  <td className="table-cell">{s.wordCount}</td>
                  <td className="table-cell">
                    {s.scoringResult ? (
                      <Badge className={bandColor(s.scoringResult.overallBand)}>
                        {s.scoringResult.overallBand}
                      </Badge>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="table-cell">
                    <Badge className={statusColor(s.status)}>{s.status}</Badge>
                  </td>
                  <td className="table-cell">{formatDate(s.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
