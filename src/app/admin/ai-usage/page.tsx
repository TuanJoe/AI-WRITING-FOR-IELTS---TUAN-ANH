"use client";

import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "@/lib/client/api";
import { StatCard } from "@/components/StatCard";
import { Badge } from "@/components/Badge";
import { formatUsd, formatVnd, formatNumber, statusColor, formatDate } from "@/lib/format";

interface Summary {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  totalCostUsd: number;
  totalCostVnd: number;
  averageLatencyMs: number;
  requests: number;
  successCount: number;
  failedCount: number;
  errorRate: number;
  avgCostPerSuccessUsd: number;
}

export default function AIUsagePage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [byDay, setByDay] = useState<{ day: string; costUsd: number; tokens: number }[]>([]);
  const [byModel, setByModel] = useState<{ modelName: string; costUsd: number; requests: number }[]>([]);
  const [byPrompt, setByPrompt] = useState<{ promptVersion: string; costUsd: number }[]>([]);
  const [logs, setLogs] = useState<
    {
      id: string;
      modelName: string;
      promptVersion: string | null;
      inputTokens: number;
      outputTokens: number;
      totalCostUsd: number;
      totalCostVnd: number;
      latencyMs: number;
      status: string;
      createdAt: string;
      user: { email: string } | null;
    }[]
  >([]);

  useEffect(() => {
    api.get<Summary>("/api/admin/ai-usage/summary").then(setSummary);
    api.get<typeof byDay>("/api/admin/ai-usage/cost-by-day").then(setByDay);
    api.get<typeof byModel>("/api/admin/ai-usage/cost-by-model").then(setByModel);
    api.get<typeof byPrompt>("/api/admin/ai-usage/cost-by-prompt").then(setByPrompt);
    api.get<{ items: typeof logs }>("/api/admin/ai-usage?pageSize=25").then((r) => setLogs(r.items));
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">AI usage & cost</h1>

      {summary && (
        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
          <StatCard label="Requests" value={formatNumber(summary.requests)} sub={`${summary.failedCount} failed`} />
          <StatCard label="Total cost" value={formatUsd(summary.totalCostUsd)} sub={formatVnd(summary.totalCostVnd)} />
          <StatCard label="Total tokens" value={formatNumber(summary.totalTokens)} />
          <StatCard label="Avg latency" value={`${summary.averageLatencyMs} ms`} />
          <StatCard label="Error rate" value={`${(summary.errorRate * 100).toFixed(1)}%`} />
          <StatCard label="Avg cost / success" value={formatUsd(summary.avgCostPerSuccessUsd)} />
          <StatCard label="Input tokens" value={formatNumber(summary.inputTokens)} />
          <StatCard label="Output tokens" value={formatNumber(summary.outputTokens)} />
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="mb-3 font-semibold text-slate-900">Cost by day (USD)</h2>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={byDay}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
              <XAxis dataKey="day" fontSize={11} />
              <YAxis fontSize={11} />
              <Tooltip />
              <Line type="monotone" dataKey="costUsd" stroke="#3366ff" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="card p-5">
          <h2 className="mb-3 font-semibold text-slate-900">Cost by model (USD)</h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={byModel}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
              <XAxis dataKey="modelName" fontSize={11} />
              <YAxis fontSize={11} />
              <Tooltip />
              <Bar dataKey="costUsd" fill="#3366ff" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card p-5">
        <h2 className="mb-3 font-semibold text-slate-900">Cost by prompt version</h2>
        {byPrompt.length === 0 ? (
          <p className="text-sm text-slate-400">No data.</p>
        ) : (
          <ul className="space-y-1">
            {byPrompt.map((p) => (
              <li key={p.promptVersion} className="flex justify-between text-sm">
                <span>{p.promptVersion}</span>
                <span className="font-medium">{formatUsd(p.costUsd)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card overflow-x-auto">
        <h2 className="border-b border-slate-100 px-5 py-3 font-semibold text-slate-900">
          Recent AI requests
        </h2>
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="th">User</th>
              <th className="th">Model</th>
              <th className="th">Prompt</th>
              <th className="th">In</th>
              <th className="th">Out</th>
              <th className="th">USD</th>
              <th className="th">VND</th>
              <th className="th">Latency</th>
              <th className="th">Status</th>
              <th className="th">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {logs.map((l) => (
              <tr key={l.id}>
                <td className="table-cell text-xs">{l.user?.email ?? "—"}</td>
                <td className="table-cell text-xs">{l.modelName}</td>
                <td className="table-cell text-xs">{l.promptVersion ?? "—"}</td>
                <td className="table-cell">{l.inputTokens}</td>
                <td className="table-cell">{l.outputTokens}</td>
                <td className="table-cell">{formatUsd(l.totalCostUsd)}</td>
                <td className="table-cell">{formatVnd(l.totalCostVnd)}</td>
                <td className="table-cell">{l.latencyMs} ms</td>
                <td className="table-cell">
                  <Badge className={statusColor(l.status)}>{l.status}</Badge>
                </td>
                <td className="table-cell text-xs">{formatDate(l.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
