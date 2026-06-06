// Server-side IELTS band calculation. The backend recomputes every score from
// sub-criteria so it never blindly trusts the model's arithmetic (section 12).

/** Round a raw band to the nearest 0.5 (IELTS reporting convention). */
export function roundToNearestHalf(value: number): number {
  return Math.round(value * 2) / 2;
}

/** Clamp a sub-criterion score into the valid IELTS range [1, 9]. */
export function clampBand(value: number): number {
  if (Number.isNaN(value)) return 1;
  return Math.min(9, Math.max(1, value));
}

export function average(values: number[]): number {
  if (values.length === 0) return 0;
  const sum = values.reduce((acc, v) => acc + clampBand(v), 0);
  return sum / values.length;
}

/** Round a criterion average to 1 decimal place for display/storage. */
export function roundOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

export interface MajorCriterionScores {
  // Exactly one of these two is present depending on task type.
  taskAchievement?: number;
  taskResponse?: number;
  coherenceAndCohesion: number;
  lexicalResource: number;
  grammaticalRangeAndAccuracy: number;
}

export interface OverallResult {
  overallBandRaw: number;
  overallBand: number;
}

/**
 * Compute overall band from the four major criterion scores.
 * overall_band_raw = average of the four; overall_band = rounded to 0.5.
 */
export function computeOverall(scores: MajorCriterionScores): OverallResult {
  const firstMajor =
    scores.taskAchievement ?? scores.taskResponse ?? 0;
  const four = [
    firstMajor,
    scores.coherenceAndCohesion,
    scores.lexicalResource,
    scores.grammaticalRangeAndAccuracy,
  ];
  const raw = average(four);
  return {
    overallBandRaw: roundOneDecimal(raw),
    overallBand: roundToNearestHalf(raw),
  };
}
