"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/client/api";
import { Badge } from "@/components/Badge";
import { formatDate } from "@/lib/format";

interface Log {
  id: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  ipAddress: string | null;
  createdAt: string;
  admin: { email: string } | null;
}

export default function AuditLogsPage() {
  const [rows, setRows] = useState<Log[]>([]);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ page: 1, totalPages: 1, total: 0 });

  const load = useCallback(async () => {
    const res = await api.get<{ items: Log[]; meta: typeof meta }>(
      `/api/admin/audit-logs?page=${page}&pageSize=40`,
    );
    setRows(res.items);
    setMeta(res.meta);
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-slate-900">Audit logs</h1>

      <div className="card overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="th">Admin</th>
              <th className="th">Action</th>
              <th className="th">Entity</th>
              <th className="th">IP</th>
              <th className="th">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((l) => (
              <tr key={l.id}>
                <td className="table-cell">{l.admin?.email ?? "—"}</td>
                <td className="table-cell">
                  <Badge className="bg-slate-100 text-slate-700">{l.action}</Badge>
                </td>
                <td className="table-cell text-xs">
                  {l.entityType}
                  {l.entityId ? ` · ${l.entityId.slice(0, 8)}` : ""}
                </td>
                <td className="table-cell text-xs">{l.ipAddress ?? "—"}</td>
                <td className="table-cell text-xs">{formatDate(l.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-500">{meta.total} entries</span>
        <div className="flex items-center gap-2">
          <button className="btn-secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
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
