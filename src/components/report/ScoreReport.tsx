import { Badge } from "@/components/Badge";
import { bandColor, severityColor } from "@/lib/format";
import { CRITERION_LABELS } from "@/lib/ielts/criteria";
import {
  scoringOutputSchema,
  type ScoringOutput,
} from "@/lib/validation/scoring-schema";

// Pure presentational report shared by the student result page and the admin
// submission detail page. Accepts the persisted scoring result.

export interface ScoreReportData {
  taskType: string;
  overallBand: number;
  overallBandRaw: number;
  taskAchievementScore: number | null;
  taskResponseScore: number | null;
  coherenceAndCohesionScore: number;
  lexicalResourceScore: number;
  grammaticalRangeAndAccuracyScore: number;
  modelConfidence: string | null;
  resultJson: unknown;
  errorCorrections: Array<{
    id: string;
    criterion: string;
    subcriterion: string | null;
    tag: string;
    severity: string;
    paragraphIndex: number | null;
    sentenceIndex: number | null;
    originalText: string;
    correctedText: string;
    explanation: string;
    impactOnScore: string | null;
    suggestedLearningFocus: string | null;
  }>;
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card p-5">
      <h2 className="mb-3 text-lg font-semibold text-slate-900">{title}</h2>
      {children}
    </section>
  );
}

function List({ items, tone }: { items: string[]; tone: string }) {
  if (!items || items.length === 0)
    return <p className="text-sm text-slate-400">None noted.</p>;
  return (
    <ul className="space-y-1">
      {items.map((it, i) => (
        <li key={i} className={`text-sm ${tone}`}>
          • {it}
        </li>
      ))}
    </ul>
  );
}

export function ScoreReport({ data }: { data: ScoreReportData }) {
  const parsed = scoringOutputSchema.safeParse(data.resultJson);
  const output: ScoringOutput | null = parsed.success ? parsed.data : null;

  const majorScores = [
    {
      label:
        data.taskType === "TASK_1" ? "Task Achievement" : "Task Response",
      value: data.taskAchievementScore ?? data.taskResponseScore ?? 0,
    },
    { label: "Coherence & Cohesion", value: data.coherenceAndCohesionScore },
    { label: "Lexical Resource", value: data.lexicalResourceScore },
    {
      label: "Grammatical Range & Accuracy",
      value: data.grammaticalRangeAndAccuracyScore,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Overall band + criteria */}
      <div className="card p-6">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
          <div
            className={`flex h-28 w-28 shrink-0 flex-col items-center justify-center rounded-2xl ${bandColor(
              data.overallBand,
            )}`}
          >
            <span className="text-4xl font-bold">{data.overallBand}</span>
            <span className="text-xs">Overall band</span>
          </div>
          <div className="grid flex-1 gap-3 sm:grid-cols-2">
            {majorScores.map((m) => (
              <div
                key={m.label}
                className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-2"
              >
                <span className="text-sm text-slate-600">{m.label}</span>
                <Badge className={bandColor(m.value)}>{m.value}</Badge>
              </div>
            ))}
          </div>
        </div>
        {output?.overall_summary && (
          <p className="mt-5 text-sm leading-relaxed text-slate-700">
            {output.overall_summary}
          </p>
        )}
        <p className="mt-2 text-xs text-slate-400">
          Raw average: {data.overallBandRaw}
          {data.modelConfidence
            ? ` · Model confidence: ${data.modelConfidence}`
            : ""}
        </p>
      </div>

      {/* Per-criterion detail */}
      {output && (
        <div className="space-y-4">
          {Object.entries(output.major_criteria).map(([key, crit]) => (
            <Section
              key={key}
              title={`${CRITERION_LABELS[key] ?? key} — Band ${crit.score}`}
            >
              {crit.summary && (
                <p className="mb-3 text-sm text-slate-700">{crit.summary}</p>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <h4 className="text-xs font-semibold uppercase text-emerald-700">
                    Strengths
                  </h4>
                  <List items={crit.strengths} tone="text-slate-700" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold uppercase text-amber-700">
                    Weaknesses
                  </h4>
                  <List items={crit.weaknesses} tone="text-slate-700" />
                </div>
              </div>
              {crit.suggestions.length > 0 && (
                <div className="mt-3">
                  <h4 className="text-xs font-semibold uppercase text-brand-700">
                    Suggestions
                  </h4>
                  <List items={crit.suggestions} tone="text-slate-700" />
                </div>
              )}
              {/* Sub-criteria */}
              {Object.keys(crit.sub_criteria).length > 0 && (
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {Object.entries(crit.sub_criteria).map(([sk, sub]) => (
                    <div
                      key={sk}
                      className="rounded-lg bg-slate-50 px-3 py-2 text-sm"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium capitalize text-slate-700">
                          {sk.replace(/_/g, " ")}
                        </span>
                        <Badge className={bandColor(sub.score)}>
                          {sub.score}
                        </Badge>
                      </div>
                      {sub.summary && (
                        <p className="mt-1 text-xs text-slate-500">
                          {sub.summary}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Section>
          ))}
        </div>
      )}

      {/* Error corrections */}
      <Section title={`Error corrections (${data.errorCorrections.length})`}>
        {data.errorCorrections.length === 0 ? (
          <p className="text-sm text-slate-400">No errors recorded.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead>
                <tr>
                  <th className="th">Tag</th>
                  <th className="th">Severity</th>
                  <th className="th">Original</th>
                  <th className="th">Correction</th>
                  <th className="th">Explanation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.errorCorrections.map((ec) => (
                  <tr key={ec.id} className="align-top">
                    <td className="table-cell">
                      <span className="font-mono text-xs">{ec.tag}</span>
                      <div className="text-[10px] text-slate-400">
                        {ec.criterion}
                        {ec.subcriterion ? ` / ${ec.subcriterion}` : ""}
                      </div>
                    </td>
                    <td className="table-cell">
                      <Badge className={severityColor(ec.severity)}>
                        {ec.severity}
                      </Badge>
                    </td>
                    <td className="table-cell max-w-xs whitespace-normal text-red-700 line-through">
                      {ec.originalText}
                    </td>
                    <td className="table-cell max-w-xs whitespace-normal text-emerald-700">
                      {ec.correctedText}
                    </td>
                    <td className="table-cell max-w-sm whitespace-normal text-slate-600">
                      {ec.explanation}
                      {ec.suggestedLearningFocus && (
                        <div className="mt-1 text-xs text-brand-600">
                          Focus: {ec.suggestedLearningFocus}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {/* Vocabulary statistics */}
      {output && (
        <Section title="Vocabulary statistics">
          {(
            [
              ["Topic-specific", output.vocabulary_statistics.topic_specific_vocabulary],
              ["Academic", output.vocabulary_statistics.academic_vocabulary],
              ["Collocations", output.vocabulary_statistics.collocations],
            ] as const
          ).map(([label, items]) => (
            <div key={label} className="mb-4">
              <h4 className="mb-1 text-xs font-semibold uppercase text-slate-500">
                {label} ({items.length})
              </h4>
              {items.length === 0 ? (
                <p className="text-sm text-slate-400">None identified.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {items.map((v, i) => (
                    <span
                      key={i}
                      title={`${v.comment}${
                        v.suggested_upgrade ? ` → ${v.suggested_upgrade}` : ""
                      }`}
                      className={`badge ${
                        v.accuracy_status === "inaccurate"
                          ? "bg-red-100 text-red-800"
                          : v.accuracy_status === "partially_accurate"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {v.text}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </Section>
      )}

      {/* Sentence structure statistics */}
      {output && (
        <Section title="Sentence structure statistics">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(
              [
                ["Simple", output.sentence_structure_statistics.simple_sentences.count],
                ["Compound", output.sentence_structure_statistics.compound_sentences.count],
                ["Complex", output.sentence_structure_statistics.complex_sentences.count],
                [
                  "Compound-complex",
                  output.sentence_structure_statistics.compound_complex_sentences.count,
                ],
              ] as const
            ).map(([label, count]) => (
              <div
                key={label}
                className="rounded-lg bg-slate-50 px-3 py-2 text-center"
              >
                <div className="text-xl font-bold text-slate-900">{count}</div>
                <div className="text-xs text-slate-500">{label}</div>
              </div>
            ))}
          </div>
          {output.sentence_structure_statistics.other_grammar_structures.length >
            0 && (
            <div className="mt-4">
              <h4 className="mb-1 text-xs font-semibold uppercase text-slate-500">
                Other grammar structures
              </h4>
              <ul className="space-y-1">
                {output.sentence_structure_statistics.other_grammar_structures.map(
                  (s, i) => (
                    <li key={i} className="text-sm text-slate-700">
                      <span className="font-medium">{s.structure_name}</span>
                      {s.example ? ` — “${s.example}”` : ""}
                      {s.comment ? (
                        <span className="text-slate-500"> ({s.comment})</span>
                      ) : null}
                    </li>
                  ),
                )}
              </ul>
            </div>
          )}
        </Section>
      )}

      {/* Priority improvement plan */}
      {output && output.priority_improvement_plan.length > 0 && (
        <Section title="Priority improvement plan">
          <ol className="space-y-2">
            {output.priority_improvement_plan.map((p, i) => (
              <li key={i} className="flex gap-3 text-sm text-slate-700">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
                  {i + 1}
                </span>
                <span>
                  {typeof p === "string"
                    ? p
                    : [p.focus, p.action, p.criterion]
                        .filter(Boolean)
                        .join(" — ")}
                </span>
              </li>
            ))}
          </ol>
        </Section>
      )}

      {/* Coverage check */}
      {output && (
        <Section title="Coverage check">
          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            <Stat label="Paragraphs" value={output.coverage_check.paragraphs_detected} />
            <Stat label="Sentences detected" value={output.coverage_check.sentences_detected} />
            <Stat label="Sentences reviewed" value={output.coverage_check.sentences_reviewed} />
            <Stat label="With errors" value={output.coverage_check.sentences_with_errors} />
            <Stat label="Without errors" value={output.coverage_check.sentences_without_errors} />
            <Stat
              label="Complete"
              value={output.coverage_check.coverage_complete ? "Yes" : "No"}
            />
          </div>
        </Section>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2">
      <div className="text-base font-semibold text-slate-900">{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
}
