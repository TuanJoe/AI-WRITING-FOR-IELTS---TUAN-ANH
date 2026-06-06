import { requireUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db";
import { checkQuota } from "@/services/writing-submission-service";
import { StatCard } from "@/components/StatCard";
import { formatDate } from "@/lib/format";

export default async function ProfilePage() {
  const user = await requireUser();
  const [quota, totals, bandTrend] = await Promise.all([
    checkQuota(user),
    prisma.writingSubmission.groupBy({
      by: ["taskType"],
      _count: true,
      where: { userId: user.id },
    }),
    prisma.scoringResult.findMany({
      where: { submission: { userId: user.id } },
      orderBy: { createdAt: "asc" },
      take: 20,
      select: { overallBand: true, createdAt: true },
    }),
  ]);

  const task1 = totals.find((t) => t.taskType === "TASK_1")?._count ?? 0;
  const task2 = totals.find((t) => t.taskType === "TASK_2")?._count ?? 0;
  const best =
    bandTrend.length > 0
      ? Math.max(...bandTrend.map((b) => b.overallBand))
      : null;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Profile & usage</h1>

      <div className="card p-5">
        <h2 className="mb-3 font-semibold text-slate-900">Account</h2>
        <dl className="grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase text-slate-500">Name</dt>
            <dd className="text-sm text-slate-800">{user.name || "—"}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-slate-500">Email</dt>
            <dd className="text-sm text-slate-800">{user.email}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-slate-500">Plan</dt>
            <dd className="text-sm text-slate-800">{user.subscriptionPlan}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-slate-500">Member since</dt>
            <dd className="text-sm text-slate-800">
              {formatDate(user.createdAt)}
            </dd>
          </div>
        </dl>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard label="Task 1 essays" value={task1} />
        <StatCard label="Task 2 essays" value={task2} />
        <StatCard label="Best band" value={best ?? "—"} />
        <StatCard
          label="Daily remaining"
          value={`${quota.dailyRemaining}/${user.dailyQuota}`}
        />
      </div>

      <div className="card p-5">
        <h2 className="mb-3 font-semibold text-slate-900">Quota</h2>
        <div className="space-y-3">
          <QuotaBar
            label="Daily"
            used={quota.dailyUsed}
            total={user.dailyQuota}
          />
          <QuotaBar
            label="Monthly"
            used={quota.monthlyUsed}
            total={user.monthlyQuota}
          />
        </div>
      </div>
    </div>
  );
}

function QuotaBar({
  label,
  used,
  total,
}: {
  label: string;
  used: number;
  total: number;
}) {
  const pct = total > 0 ? Math.min(100, (used / total) * 100) : 0;
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm">
        <span className="text-slate-600">{label}</span>
        <span className="text-slate-500">
          {used} / {total}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-brand-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
