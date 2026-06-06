"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/client/api";
import { Badge } from "@/components/Badge";
import { formatDate } from "@/lib/format";

interface UserRow {
  id: string;
  email: string;
  name: string | null;
  role: string;
  subscriptionPlan: string;
  dailyQuota: number;
  monthlyQuota: number;
  isActive: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  _count: { submissions: number };
}

const ROLES = [
  "STUDENT",
  "TEACHER",
  "SUPPORT",
  "PRODUCT_ADMIN",
  "FINANCE_ADMIN",
  "SUPER_ADMIN",
];

export default function UsersPage() {
  const [rows, setRows] = useState<UserRow[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const params = new URLSearchParams({ pageSize: "50" });
    if (search) params.set("search", search);
    const res = await api.get<{ items: UserRow[] }>(`/api/admin/users?${params}`);
    setRows(res.items);
  }, [search]);

  useEffect(() => {
    load();
  }, [load]);

  async function update(id: string, data: Partial<UserRow>) {
    setError(null);
    try {
      await api.patch(`/api/admin/users/${id}`, data);
      load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Update failed");
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-slate-900">Users</h1>
      <div className="flex gap-3">
        <input
          className="input max-w-xs"
          placeholder="Search by email"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      {error && <p className="text-red-600">{error}</p>}

      <div className="card overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="th">Email</th>
              <th className="th">Role</th>
              <th className="th">Plan</th>
              <th className="th">Daily quota</th>
              <th className="th">Submissions</th>
              <th className="th">Active</th>
              <th className="th">Last login</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((u) => (
              <tr key={u.id}>
                <td className="table-cell">
                  {u.email}
                  <div className="text-[10px] text-slate-400">{u.name}</div>
                </td>
                <td className="table-cell">
                  <select
                    className="rounded border border-slate-300 px-2 py-1 text-xs"
                    value={u.role}
                    onChange={(e) => update(u.id, { role: e.target.value })}
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="table-cell">{u.subscriptionPlan}</td>
                <td className="table-cell">
                  <input
                    type="number"
                    className="w-16 rounded border border-slate-300 px-2 py-1 text-xs"
                    defaultValue={u.dailyQuota}
                    onBlur={(e) =>
                      update(u.id, { dailyQuota: parseInt(e.target.value, 10) })
                    }
                  />
                </td>
                <td className="table-cell">{u._count.submissions}</td>
                <td className="table-cell">
                  <button onClick={() => update(u.id, { isActive: !u.isActive })}>
                    <Badge
                      className={
                        u.isActive
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-red-100 text-red-800"
                      }
                    >
                      {u.isActive ? "Active" : "Disabled"}
                    </Badge>
                  </button>
                </td>
                <td className="table-cell text-xs">
                  {u.lastLoginAt ? formatDate(u.lastLoginAt) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
