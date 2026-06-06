"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/client/api";
import { Badge } from "@/components/Badge";
import { statusColor, formatDate } from "@/lib/format";

interface Prompt {
  id: string;
  name: string;
  code: string;
  version: string;
  taskType: string | null;
  modelName: string;
  status: string;
  isDefault: boolean;
  updatedAt: string;
}

export default function PromptsPage() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [error, setError] = useState<string | null>(null);

  function load() {
    api
      .get<Prompt[]>("/api/admin/prompts")
      .then(setPrompts)
      .catch((e) => setError(e.message));
  }
  useEffect(load, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Prompt library</h1>
        <Link href="/admin/prompts/new" className="btn-primary">
          + New prompt
        </Link>
      </div>
      {error && <p className="text-red-600">{error}</p>}

      <div className="card overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="th">Name</th>
              <th className="th">Code</th>
              <th className="th">Version</th>
              <th className="th">Task</th>
              <th className="th">Model</th>
              <th className="th">Status</th>
              <th className="th">Default</th>
              <th className="th">Updated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {prompts.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50">
                <td className="table-cell">
                  <Link href={`/admin/prompts/${p.id}`} className="text-brand-700">
                    {p.name}
                  </Link>
                </td>
                <td className="table-cell font-mono text-xs">{p.code}</td>
                <td className="table-cell">{p.version}</td>
                <td className="table-cell">
                  {p.taskType ? p.taskType.replace("_", " ") : "Both"}
                </td>
                <td className="table-cell text-xs">{p.modelName}</td>
                <td className="table-cell">
                  <Badge className={statusColor(p.status)}>{p.status}</Badge>
                </td>
                <td className="table-cell">{p.isDefault ? "★" : ""}</td>
                <td className="table-cell text-xs">{formatDate(p.updatedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {prompts.length === 0 && (
          <p className="p-6 text-center text-sm text-slate-400">No prompts.</p>
        )}
      </div>
    </div>
  );
}
