
export enum TaskType {
  TASK_1 = 'TASK_1',
  TASK_2 = 'TASK_2'
}

export interface ExcelEssay {
  stt: string | number;
  source: string;
  topic: string;
  sample: string;
  gr: number | string;
  lr: number | string;
  cc: number | string;
  ta: number | string;
  overall: number | string;
}

export interface CriterionResult {
  score: number;
  explanation: string;
}

export interface ScoringResult {
  overallBand: number;
  criteria: {
    taskAchievement: CriterionResult;
    coherenceCohesion: CriterionResult;
    lexicalResource: CriterionResult;
    grammaticalRange: CriterionResult;
  };
  detailedFeedback: string;
  improvedVersion: string;
  keyStrengths: string[];
  areasForImprovement: string[];
}

export type ViewMode = 'ANALYZER' | 'REPOSITORY';

export interface AppState {
  viewMode: ViewMode;
  taskType: TaskType;
  question: string;
  essay: string;
  isAnalyzing: boolean;
  result: ScoringResult | null;
  error: string | null;
  history: ExcelEssay[];
}
