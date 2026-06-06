import type { TaskType } from "@prisma/client";
import { SUBCRITERIA } from "@/lib/ielts/criteria";
import {
  average,
  clampBand,
  computeOverall,
  roundOneDecimal,
} from "@/lib/scoring/band";
import type { ScoringOutput, MajorCriterionOutput } from "@/lib/validation/scoring-schema";

// Recompute every score server-side from the model's sub-criterion scores so we
// never blindly trust the model's own arithmetic (sections 12 & 23). Where
// sub-criteria are missing we fall back to the model's reported criterion score.

export interface NormalizedScores {
  taskAchievementScore: number | null;
  taskResponseScore: number | null;
  coherenceAndCohesionScore: number;
  lexicalResourceScore: number;
  grammaticalRangeAndAccuracyScore: number;
  overallBand: number;
  overallBandRaw: number;
}

function findCriterion(
  output: ScoringOutput,
  ...keys: string[]
): MajorCriterionOutput | undefined {
  for (const key of keys) {
    const found = output.major_criteria[key];
    if (found) return found;
  }
  // Fallback: fuzzy match on key substring.
  const entryKey = Object.keys(output.major_criteria).find((k) =>
    keys.some((target) => k.includes(target.slice(0, 6))),
  );
  return entryKey ? output.major_criteria[entryKey] : undefined;
}

function scoreFromSubcriteria(
  criterion: MajorCriterionOutput | undefined,
  subKeys: readonly string[],
): number {
  if (!criterion) return 1;
  const subScores: number[] = [];
  for (const key of subKeys) {
    const sub = criterion.sub_criteria?.[key];
    if (sub && typeof sub.score === "number") {
      subScores.push(clampBand(sub.score));
    }
  }
  if (subScores.length > 0) {
    return roundOneDecimal(average(subScores));
  }
  // No usable sub-criteria — fall back to the model's criterion score.
  return roundOneDecimal(clampBand(criterion.score ?? 1));
}

export function normalizeScores(
  output: ScoringOutput,
  taskType: TaskType,
): NormalizedScores {
  const coherence = scoreFromSubcriteria(
    findCriterion(output, "coherence_and_cohesion", "coherence"),
    SUBCRITERIA.coherenceAndCohesion,
  );
  const lexical = scoreFromSubcriteria(
    findCriterion(output, "lexical_resource", "lexical"),
    SUBCRITERIA.lexicalResource,
  );
  const grammar = scoreFromSubcriteria(
    findCriterion(
      output,
      "grammatical_range_and_accuracy",
      "grammatical",
      "grammar",
    ),
    SUBCRITERIA.grammaticalRangeAndAccuracy,
  );

  let taskAchievementScore: number | null = null;
  let taskResponseScore: number | null = null;

  if (taskType === "TASK_1") {
    taskAchievementScore = scoreFromSubcriteria(
      findCriterion(output, "task_achievement", "achievement"),
      SUBCRITERIA.taskAchievement,
    );
  } else {
    taskResponseScore = scoreFromSubcriteria(
      findCriterion(output, "task_response", "response"),
      SUBCRITERIA.taskResponse,
    );
  }

  const { overallBand, overallBandRaw } = computeOverall({
    taskAchievement: taskAchievementScore ?? undefined,
    taskResponse: taskResponseScore ?? undefined,
    coherenceAndCohesion: coherence,
    lexicalResource: lexical,
    grammaticalRangeAndAccuracy: grammar,
  });

  return {
    taskAchievementScore,
    taskResponseScore,
    coherenceAndCohesionScore: coherence,
    lexicalResourceScore: lexical,
    grammaticalRangeAndAccuracyScore: grammar,
    overallBand,
    overallBandRaw,
  };
}
