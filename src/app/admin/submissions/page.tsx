"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client/api";
import { Badge } from "@/components/Badge";
import { bandColor, statusColor, formatDate, formatUsd, formatVnd } from "@/lib/format";

interface Row {
  id: string;
  taskType: string;
  wordCount: number;
  status: string;
  createdAt: string;
  user: { email: string; subscriptionPlan: string };
  scoringResult: {
    overallBand: number;
    taskAchievementScore: number | null;
    taskResponseScore: number | null;
    coherenceAndCohesionScore: number;
    lexicalResourceScore: number;
    grammaticalRangeAndAccuracyScore: number;
    modelName: string;
    promptVersion: string;
  } | null;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    totalCostUsd: number;
    totalCostVnd: number;
  };
}

export default function AdminSubmissionsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [filters, setFilters] = useState({
    userEmail: "",
    taskType: "",
    status: "",
    bandMin: "",
    bandMax: "",
  });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: "25" });
    Object.entries(filters).forEach(([k, v]) => v && params.set(k, v));
    try {
      const res = await api.get<{ items: Row[]; meta: typeof meta }>(
        `/api/admin/submissions?${params}`,
      );
      setRows(res.items);
      setMeta(res.meta);
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Submissions</h1>
        <a href="/api/admin/submissions/export" className="btn-secondary">
          Export CSV
        </a>
      </div>

      <div className="card flex flex-wrap gap-3 p-4">
        <input
          className="input max-w-[200px]"
          placeholder="User email"
          value={filters.userEmail}
          onChange={(e) => setFilters((f) => ({ ...f, userEmail: e.target.value }))}
        />
        <select
          className="input max-w-[140px]"
          value={filters.taskType}
          onChange={(e) => setFilters((f) => ({ ...f, taskType: e.target.value }))}
        >
          <option value="">All tasks</option>
          <option value="TASK_1">Task 1</option>
          <option value="TASK_2">Task 2</option>
        </select>
        <select
          className="input max-w-[150px]"
          value={filters.status}
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
        >
          <option value="">All statuses</option>
          <option value="COMPLETED">Completed</option>
          <option value="FAILED">Failed</option>
          <option value="PROCESSING">Processing</option>
          <option value="PENDING">Pending</option>
        </select>
        <input
          className="input max-w-[110px]"
          placeholder="Band min"
          value={filters.bandMin}
          onChange={(e) => setFilters((f) => ({ ...f, bandMin: e.target.value }))}
        />
        <input
          className="input max-w-[110px]"
          placeholder="Band max"
          value={filters.bandMax}
          onChange={(e) => setFilters((f) => ({ ...f, bandMax: e.target.value }))}
        />
        <button className="btn-primary" onClick={() => setPage(1)}>
          Apply
        </button>
      </div>

      <div className="card overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="th">User</th>
              <th className="th">Task</th>
              <th className="th">Words</th>
              <th className="th">Overall</th>
              <th className="th">TA/TR</th>
              <th className="th">CC</th>
              <th className="th">LR</th>
              <th className="th">GRA</th>
              <th className="th">Model</th>
              <th className="th">Prompt</th>
              <th className="th">Tokens</th>
              <th className="th">USD</th>
              <th className="th">VND</th>
              <th className="th">Status</th>
              <th className="th">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r) => {
              const sr = r.scoringResult;
              return (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="table-cell">
                    <Link href={`/admin/submissions/${r.id}`} className="text-brand-700">
                      {r.user.email}
                    </Link>
                    <div className="text-[10px] text-slate-400">
                      {r.user.subscriptionPlan}
                    </div>
                  </td>
                  <td className="table-cell">{r.taskType.replace("_", " ")}</td>
                  <td className="table-cell">{r.wordCount}</td>
                  <td className="table-cell">
                    {sr ? (
                      <Badge className={bandColor(sr.overallBand)}>
                        {sr.overallBand}
                      </Badge>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="table-cell">
                    {sr?.taskAchievementScore ?? sr?.taskResponseScore ?? "—"}
                  </td>
                  <td className="table-cell">{sr?.coherenceAndCohesionScore ?? "—"}</td>
                  <td className="table-cell">{sr?.lexicalResourceScore ?? "—"}</td>
                  <td className="table-cell">
                    {sr?.grammaticalRangeAndAccuracyScore ?? "—"}
                  </td>
                  <td className="table-cell text-xs">{sr?.modelName ?? "—"}</td>
                  <td className="table-cell text-xs">{sr?.promptVersion ?? "—"}</td>
                  <td className="table-cell">{r.usage.totalTokens}</td>
                  <td className="table-cell">{formatUsd(r.usage.totalCostUsd)}</td>
                  <td className="table-cell">{formatVnd(r.usage.totalCostVnd)}</td>
                  <td className="table-cell">
                    <Badge className={statusColor(r.status)}>{r.status}</Badge>
                  </td>
                  <td className="table-cell text-xs">{formatDate(r.createdAt)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {rows.length === 0 && !loading && (
          <p className="p-6 text-center text-sm text-slate-400">No submissions.</p>
        )}
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-500">{meta.total} total</span>
        <div className="flex items-center gap-2">
          <button
            className="btn-secondary"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Prev
          </button>
          <span>
            {meta.page} / {meta.totalPages}
          </span>
          <button
            className="btn-secondary"
            disabled={page >= meta.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
