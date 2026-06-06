"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "@/lib/client/api";

export default function NewPromptPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    code: "",
    version: "1.0.0",
    taskType: "",
    modelName: "gemini-2.5-flash",
    systemInstruction: "",
    userPromptTemplate:
      "Task type:\n{{task_type}}\n\n<question_prompt>\n{{question_prompt}}\n</question_prompt>\n\n<student_essay>\n{{student_essay}}\n</student_essay>\n\nReturn valid JSON only.",
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function create() {
    setSaving(true);
    setError(null);
    try {
      const created = await api.post<{ id: string }>("/api/admin/prompts", {
        ...form,
        taskType: form.taskType || null,
      });
      router.push(`/admin/prompts/${created.id}`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Create failed");
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link href="/admin/prompts" className="text-sm text-brand-600">
        ← Back to library
      </Link>
      <h1 className="text-2xl font-bold text-slate-900">New prompt</h1>

      <div className="card space-y-4 p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Name</label>
            <input className="input" value={form.name} onChange={(e) => set("name", e.target.value)} />
          </div>
          <div>
            <label className="label">Code (lowercase_underscores)</label>
            <input className="input font-mono" value={form.code} onChange={(e) => set("code", e.target.value)} />
          </div>
          <div>
            <label className="label">Version</label>
            <input className="input" value={form.version} onChange={(e) => set("version", e.target.value)} />
          </div>
          <div>
            <label className="label">Task type</label>
            <select className="input" value={form.taskType} onChange={(e) => set("taskType", e.target.value)}>
              <option value="">Both</option>
              <option value="TASK_1">Task 1</option>
              <option value="TASK_2">Task 2</option>
            </select>
          </div>
          <div>
            <label className="label">Model</label>
            <input className="input" value={form.modelName} onChange={(e) => set("modelName", e.target.value)} />
          </div>
        </div>
        <div>
          <label className="label">System instruction</label>
          <textarea
            className="input min-h-[160px] font-mono text-xs"
            value={form.systemInstruction}
            onChange={(e) => set("systemInstruction", e.target.value)}
          />
        </div>
        <div>
          <label className="label">User prompt template</label>
          <textarea
            className="input min-h-[140px] font-mono text-xs"
            value={form.userPromptTemplate}
            onChange={(e) => set("userPromptTemplate", e.target.value)}
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="btn-primary" onClick={create} disabled={saving || !form.name || !form.code}>
          {saving ? "Creating…" : "Create draft"}
        </button>
      </div>
    </div>
  );
}
