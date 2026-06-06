"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client/api";
import { StatCard } from "@/components/StatCard";
import { formatUsd, formatVnd, formatNumber } from "@/lib/format";

interface Dashboard {
  totalUsers: number;
  activeUsers: number;
  totalSubmissions: number;
  submissionsToday: number;
  failedJobs: number;
  averageBand: number;
  averageLatencyMs: number;
  costTodayUsd: number;
  costTodayVnd: number;
  costMonthUsd: number;
  costMonthVnd: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCostUsd: number;
  totalCostVnd: number;
  topCostlyUsers: { email: string; costUsd: number }[];
  topCostlyPrompts: { promptVersion: string; costUsd: number }[];
}

export default function AdminDashboardPage() {
  const [d, setD] = useState<Dashboard | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<Dashboard>("/api/admin/dashboard")
      .then(setD)
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="text-red-600">{error}</p>;
  if (!d) return <p className="text-slate-500">Loading…</p>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Operations dashboard</h1>

      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <StatCard label="Total users" value={formatNumber(d.totalUsers)} sub={`${d.activeUsers} active`} />
        <StatCard label="Submissions" value={formatNumber(d.totalSubmissions)} sub={`${d.submissionsToday} today`} />
        <StatCard label="Average band" value={d.averageBand || "—"} />
        <StatCard label="Failed jobs" value={d.failedJobs} />
        <StatCard label="Cost today" value={formatUsd(d.costTodayUsd)} sub={formatVnd(d.costTodayVnd)} />
        <StatCard label="Cost this month" value={formatUsd(d.costMonthUsd)} sub={formatVnd(d.costMonthVnd)} />
        <StatCard label="Total cost" value={formatUsd(d.totalCostUsd)} sub={formatVnd(d.totalCostVnd)} />
        <StatCard label="Avg latency" value={`${d.averageLatencyMs} ms`} />
        <StatCard label="Input tokens" value={formatNumber(d.totalInputTokens)} />
        <StatCard label="Output tokens" value={formatNumber(d.totalOutputTokens)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="mb-3 font-semibold text-slate-900">Top costly users</h2>
          {d.topCostlyUsers.length === 0 ? (
            <p className="text-sm text-slate-400">No data.</p>
          ) : (
            <ul className="space-y-2">
              {d.topCostlyUsers.map((u) => (
                <li key={u.email} className="flex justify-between text-sm">
                  <span className="truncate text-slate-700">{u.email}</span>
                  <span className="font-medium">{formatUsd(u.costUsd)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="card p-5">
          <h2 className="mb-3 font-semibold text-slate-900">
            Top costly prompt versions
          </h2>
          {d.topCostlyPrompts.length === 0 ? (
            <p className="text-sm text-slate-400">No data.</p>
          ) : (
            <ul className="space-y-2">
              {d.topCostlyPrompts.map((p) => (
                <li key={p.promptVersion} className="flex justify-between text-sm">
                  <span className="text-slate-700">{p.promptVersion}</span>
                  <span className="font-medium">{formatUsd(p.costUsd)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
