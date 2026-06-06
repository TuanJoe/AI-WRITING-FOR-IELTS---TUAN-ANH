"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/client/api";

type TaskType = "TASK_1" | "TASK_2";

const MIN_WORDS: Record<TaskType, number> = { TASK_1: 150, TASK_2: 250 };

export default function NewSubmissionPage() {
  const router = useRouter();
  const [taskType, setTaskType] = useState<TaskType>("TASK_2");
  const [question, setQuestion] = useState("");
  const [essay, setEssay] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const wordCount = useMemo(
    () => (essay.trim() ? essay.trim().split(/\s+/).length : 0),
    [essay],
  );
  const recommended = MIN_WORDS[taskType];
  const belowRecommended = wordCount > 0 && wordCount < recommended;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.post<{
        submissionId: string;
        status: string;
        errorMessage?: string;
      }>("/api/writing-submissions", {
        taskType,
        questionPrompt: question,
        essayText: essay,
      });
      if (res.status === "FAILED") {
        setError(res.errorMessage || "Scoring failed. Please try again.");
        setLoading(false);
        return;
      }
      router.push(`/submissions/${res.submissionId}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Submission failed");
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col items-center justify-center py-24 text-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
        <h2 className="mt-6 text-lg font-semibold text-slate-900">
          Scoring your essay…
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Our examiner is reviewing every sentence. This usually takes 20–40
          seconds.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold text-slate-900">New Writing Submission</h1>
      <p className="mt-1 text-sm text-slate-500">
        Choose the task, paste the question and your essay.
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-5">
        <div className="card p-5">
          <label className="label">Task type</label>
          <div className="flex gap-3">
            {(["TASK_1", "TASK_2"] as TaskType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTaskType(t)}
                className={`flex-1 rounded-lg border px-4 py-3 text-sm font-medium ${
                  taskType === t
                    ? "border-brand-500 bg-brand-50 text-brand-700"
                    : "border-slate-300 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {t === "TASK_1" ? "Task 1 (≥150 words)" : "Task 2 (≥250 words)"}
              </button>
            ))}
          </div>
        </div>

        <div className="card p-5">
          <label className="label">Question prompt</label>
          <textarea
            required
            className="input min-h-[100px]"
            placeholder="Paste the exact IELTS question / task statement here…"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
          />
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between">
            <label className="label mb-0">Your essay</label>
            <span
              className={`text-sm font-medium ${
                belowRecommended ? "text-amber-600" : "text-slate-500"
              }`}
            >
              {wordCount} words
              {belowRecommended ? ` · below recommended ${recommended}` : ""}
            </span>
          </div>
          <textarea
            required
            className="input mt-2 min-h-[320px] font-serif leading-relaxed"
            placeholder="Write or paste your essay here…"
            value={essay}
            onChange={(e) => setEssay(e.target.value)}
          />
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="flex justify-end">
          <button type="submit" className="btn-primary px-6">
            Submit for scoring
          </button>
        </div>
      </form>
    </div>
  );
}
