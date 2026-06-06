import Link from "next/link";
import { requireUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db";
import { checkQuota } from "@/services/writing-submission-service";
import { StatCard } from "@/components/StatCard";
import { Badge } from "@/components/Badge";
import { bandColor, statusColor, formatDate } from "@/lib/format";

export default async function DashboardPage() {
  const user = await requireUser();
  const [quota, recent, completedCount, avg] = await Promise.all([
    checkQuota(user),
    prisma.writingSubmission.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { scoringResult: { select: { overallBand: true } } },
    }),
    prisma.writingSubmission.count({
      where: { userId: user.id, status: "COMPLETED" },
    }),
    prisma.scoringResult.aggregate({
      _avg: { overallBand: true },
      where: { submission: { userId: user.id } },
    }),
  ]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Hi{user.name ? `, ${user.name}` : ""} 👋
          </h1>
          <p className="text-sm text-slate-500">
            Ready to score another essay?
          </p>
        </div>
        <Link href="/writing/new" className="btn-primary">
          + New Submission
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard label="Essays scored" value={completedCount} />
        <StatCard
          label="Average band"
          value={avg._avg.overallBand ? avg._avg.overallBand.toFixed(1) : "—"}
        />
        <StatCard
          label="Today's quota"
          value={`${quota.dailyRemaining}/${user.dailyQuota}`}
          sub="remaining"
        />
        <StatCard
          label="Monthly quota"
          value={`${quota.monthlyRemaining}/${user.monthlyQuota}`}
          sub="remaining"
        />
      </div>

      <div className="card">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <h2 className="font-semibold text-slate-900">Recent submissions</h2>
          <Link href="/submissions" className="text-sm text-brand-600">
            View all
          </Link>
        </div>
        {recent.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-slate-500">
            No submissions yet.{" "}
            <Link href="/writing/new" className="text-brand-600">
              Score your first essay →
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {recent.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/submissions/${s.id}`}
                  className="flex items-center justify-between px-5 py-3 hover:bg-slate-50"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-slate-800">
                      {s.questionPrompt.slice(0, 80) || "Untitled"}
                    </div>
                    <div className="mt-0.5 text-xs text-slate-400">
                      {s.taskType.replace("_", " ")} · {s.wordCount} words ·{" "}
                      {formatDate(s.createdAt)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {s.scoringResult ? (
                      <Badge className={bandColor(s.scoringResult.overallBand)}>
                        Band {s.scoringResult.overallBand}
                      </Badge>
                    ) : (
                      <Badge className={statusColor(s.status)}>{s.status}</Badge>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
