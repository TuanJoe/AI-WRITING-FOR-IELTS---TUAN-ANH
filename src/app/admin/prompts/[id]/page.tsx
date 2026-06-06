"use client";

import { use, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "@/lib/client/api";
import { Badge } from "@/components/Badge";
import { statusColor, formatDate, formatUsd } from "@/lib/format";

interface Prompt {
  id: string;
  name: string;
  code: string;
  version: string;
  taskType: string | null;
  modelName: string;
  systemInstruction: string;
  userPromptTemplate: string;
  status: string;
  isDefault: boolean;
}
interface Version {
  id: string;
  version: string;
  status: string;
  isDefault: boolean;
  publishedAt: string | null;
  createdAt: string;
}

export default function PromptDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const [versions, setVersions] = useState<Version[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await api.get<{ prompt: Prompt; versions: Version[] }>(
      `/api/admin/prompts/${id}`,
    );
    setPrompt(res.prompt);
    setVersions(res.versions);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function act(fn: () => Promise<unknown>, success: string) {
    setBusy(true);
    setMsg(null);
    try {
      await fn();
      setMsg(success);
      await load();
    } catch (e) {
      setMsg(e instanceof ApiError ? e.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }

  if (!prompt) return <p className="text-slate-500">Loading…</p>;
  const editable = prompt.status === "DRAFT" || prompt.status === "TESTING";

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <Link href="/admin/prompts" className="text-sm text-brand-600">
        ← Back to library
      </Link>

      <div className="card p-5">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-bold text-slate-900">{prompt.name}</h1>
          <Badge className={statusColor(prompt.status)}>{prompt.status}</Badge>
          {prompt.isDefault && <Badge className="bg-brand-100 text-brand-700">Default</Badge>}
          <span className="text-sm text-slate-400">
            {prompt.code} · v{prompt.version}
          </span>
        </div>

        {/* Lifecycle actions (section 19.3) */}
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            className="btn-secondary"
            disabled={busy}
            onClick={() =>
              act(
                () => api.post(`/api/admin/prompts/${id}/clone`),
                "Cloned into a new draft.",
              ).then(() => router.refresh())
            }
          >
            Clone
          </button>
          {editable && (
            <button
              className="btn-primary"
              disabled={busy}
              onClick={() =>
                act(
                  () => api.post(`/api/admin/prompts/${id}/publish`),
                  "Published.",
                )
              }
            >
              Publish
            </button>
          )}
          {prompt.status !== "ARCHIVED" && (
            <button
              className="btn-secondary"
              disabled={busy}
              onClick={() =>
                act(
                  () => api.post(`/api/admin/prompts/${id}/archive`),
                  "Archived.",
                )
              }
            >
              Archive
            </button>
          )}
        </div>
        {msg && <p className="mt-3 text-sm text-emerald-600">{msg}</p>}
        {!editable && (
          <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
            Published/archived prompts can&apos;t be edited. Clone to make changes.
          </p>
        )}
      </div>

      <PromptEditor prompt={prompt} editable={editable} onSaved={load} />

      <PromptTester promptId={id} />

      {/* Version history + rollback */}
      <div className="card p-5">
        <h2 className="mb-3 font-semibold text-slate-900">Version history</h2>
        <table className="min-w-full divide-y divide-slate-200">
          <thead>
            <tr>
              <th className="th">Version</th>
              <th className="th">Status</th>
              <th className="th">Published</th>
              <th className="th"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {versions.map((v) => (
              <tr key={v.id}>
                <td className="table-cell">
                  <Link href={`/admin/prompts/${v.id}`} className="text-brand-700">
                    v{v.version}
                  </Link>
                  {v.isDefault && " ★"}
                </td>
                <td className="table-cell">
                  <Badge className={statusColor(v.status)}>{v.status}</Badge>
                </td>
                <td className="table-cell text-xs">
                  {v.publishedAt ? formatDate(v.publishedAt) : "—"}
                </td>
                <td className="table-cell">
                  {v.status === "DEPRECATED" && (
                    <button
                      className="text-sm text-brand-600"
                      disabled={busy}
                      onClick={() =>
                        act(
                          () => api.post(`/api/admin/prompts/${v.id}/rollback`),
                          `Rolled back to v${v.version}.`,
                        )
                      }
                    >
                      Roll back to this
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PromptEditor({
  prompt,
  editable,
  onSaved,
}: {
  prompt: Prompt;
  editable: boolean;
  onSaved: () => void;
}) {
  const [name, setName] = useState(prompt.name);
  const [modelName, setModelName] = useState(prompt.modelName);
  const [system, setSystem] = useState(prompt.systemInstruction);
  const [template, setTemplate] = useState(prompt.userPromptTemplate);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      await api.patch(`/api/admin/prompts/${prompt.id}`, {
        name,
        modelName,
        systemInstruction: system,
        userPromptTemplate: template,
      });
      setMsg("Saved.");
      onSaved();
    } catch (e) {
      setMsg(e instanceof ApiError ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card space-y-4 p-5">
      <h2 className="font-semibold text-slate-900">Prompt content</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Name</label>
          <input className="input" value={name} disabled={!editable} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="label">Model</label>
          <input className="input" value={modelName} disabled={!editable} onChange={(e) => setModelName(e.target.value)} />
        </div>
      </div>
      <div>
        <label className="label">System instruction</label>
        <textarea
          className="input min-h-[200px] font-mono text-xs"
          value={system}
          disabled={!editable}
          onChange={(e) => setSystem(e.target.value)}
        />
      </div>
      <div>
        <label className="label">
          User prompt template (placeholders: {"{{task_type}}, {{question_prompt}}, {{student_essay}}, {{word_count}}"})
        </label>
        <textarea
          className="input min-h-[160px] font-mono text-xs"
          value={template}
          disabled={!editable}
          onChange={(e) => setTemplate(e.target.value)}
        />
      </div>
      {editable && (
        <div className="flex items-center gap-3">
          <button className="btn-primary" onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save draft"}
          </button>
          {msg && <span className="text-sm text-emerald-600">{msg}</span>}
        </div>
      )}
    </div>
  );
}

function PromptTester({ promptId }: { promptId: string }) {
  const [taskType, setTaskType] = useState("TASK_2");
  const [questionPrompt, setQuestionPrompt] = useState("");
  const [essayText, setEssayText] = useState("");
  const [expectedScore, setExpectedScore] = useState("");
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<{
    actualScore: number | null;
    scoreDiff: number | null;
    valid: boolean;
    latencyMs: number;
    costUsd: number;
    rawText: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setRunning(true);
    setError(null);
    setResult(null);
    try {
      const res = await api.post<typeof result>(
        `/api/admin/prompts/${promptId}/test`,
        {
          taskType,
          questionPrompt,
          essayText,
          expectedScore: expectedScore ? parseFloat(expectedScore) : undefined,
        },
      );
      setResult(res);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Test failed");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="card space-y-3 p-5">
      <h2 className="font-semibold text-slate-900">Test this prompt</h2>
      <div className="flex gap-3">
        <select className="input max-w-[140px]" value={taskType} onChange={(e) => setTaskType(e.target.value)}>
          <option value="TASK_1">Task 1</option>
          <option value="TASK_2">Task 2</option>
        </select>
        <input
          className="input max-w-[160px]"
          placeholder="Expected band (optional)"
          value={expectedScore}
          onChange={(e) => setExpectedScore(e.target.value)}
        />
      </div>
      <textarea className="input" placeholder="Question prompt" value={questionPrompt} onChange={(e) => setQuestionPrompt(e.target.value)} />
      <textarea className="input min-h-[140px]" placeholder="Sample essay" value={essayText} onChange={(e) => setEssayText(e.target.value)} />
      <button className="btn-primary" onClick={run} disabled={running || !questionPrompt || !essayText}>
        {running ? "Running…" : "Run test"}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {result && (
        <div className="rounded-lg bg-slate-50 p-4 text-sm">
          <p>
            Actual band: <strong>{result.actualScore ?? "—"}</strong>
            {result.scoreDiff !== null && ` (diff ${result.scoreDiff})`} ·{" "}
            {result.valid ? "valid" : "invalid"} output · {result.latencyMs} ms ·{" "}
            {formatUsd(result.costUsd)}
          </p>
          <details className="mt-2">
            <summary className="cursor-pointer text-brand-600">Raw output</summary>
            <pre className="mt-2 max-h-72 overflow-auto rounded bg-slate-900 p-3 text-xs text-slate-100">
              {result.rawText}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
}
