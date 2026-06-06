import { z } from "zod";

// Strict runtime validation schema for the structured Gemini scoring output
// (sections 17 & 18). The backend never trusts raw model output — it must pass
// this schema (after at most one repair attempt) before being persisted.

const band = z.coerce.number().min(0).max(9);
const stringArray = z.array(z.string()).default([]);

const subCriterion = z.object({
  score: band,
  summary: z.string().default(""),
  strengths: stringArray,
  weaknesses: stringArray,
  suggestions: stringArray,
});

const majorCriterion = z.object({
  score: band,
  summary: z.string().default(""),
  strengths: stringArray,
  weaknesses: stringArray,
  suggestions: stringArray,
  sub_criteria: z.record(z.string(), subCriterion).default({}),
});

const vocabItem = z.object({
  text: z.string(),
  category: z.string().default(""),
  accuracy_status: z
    .enum(["accurate", "partially_accurate", "inaccurate"])
    .catch("accurate"),
  comment: z.string().default(""),
  suggested_upgrade: z.string().default(""),
});

const sentenceItem = z.object({
  sentence_index: z.coerce.number().int().nonnegative().default(0),
  sentence: z.string().default(""),
  sentence_type: z.string().default(""),
  explanation: z.string().default(""),
});

const sentenceBucket = z.object({
  count: z.coerce.number().int().nonnegative().default(0),
  items: z.array(sentenceItem).default([]),
});

const otherStructure = z.object({
  structure_name: z.string(),
  example: z.string().default(""),
  accuracy_status: z.string().default(""),
  comment: z.string().default(""),
});

const errorCorrection = z.object({
  error_id: z.string().optional(),
  criterion: z.string().default(""),
  subcriterion: z.string().optional().nullable().default(null),
  tag: z.string(),
  severity: z.enum(["low", "medium", "high"]).catch("medium"),
  paragraph_index: z.coerce.number().int().nullable().optional().default(null),
  sentence_index: z.coerce.number().int().nullable().optional().default(null),
  original_text: z.string().default(""),
  corrected_text: z.string().default(""),
  explanation: z.string().default(""),
  impact_on_score: z.string().optional().nullable().default(null),
  suggested_learning_focus: z.string().optional().nullable().default(null),
});

export const scoringOutputSchema = z.object({
  task_type: z.string().default(""),
  word_count: z.coerce.number().int().nonnegative().default(0),
  is_valid_ielts_response: z.boolean().default(true),
  validation_warnings: stringArray,
  overall_band: band,
  overall_band_raw: band,
  overall_summary: z.string().default(""),
  major_criteria: z.record(z.string(), majorCriterion),
  vocabulary_statistics: z
    .object({
      topic_specific_vocabulary: z.array(vocabItem).default([]),
      academic_vocabulary: z.array(vocabItem).default([]),
      collocations: z.array(vocabItem).default([]),
    })
    .default({
      topic_specific_vocabulary: [],
      academic_vocabulary: [],
      collocations: [],
    }),
  sentence_structure_statistics: z
    .object({
      simple_sentences: sentenceBucket.default({ count: 0, items: [] }),
      compound_sentences: sentenceBucket.default({ count: 0, items: [] }),
      complex_sentences: sentenceBucket.default({ count: 0, items: [] }),
      compound_complex_sentences: sentenceBucket.default({
        count: 0,
        items: [],
      }),
      other_grammar_structures: z.array(otherStructure).default([]),
    })
    .default({
      simple_sentences: { count: 0, items: [] },
      compound_sentences: { count: 0, items: [] },
      complex_sentences: { count: 0, items: [] },
      compound_complex_sentences: { count: 0, items: [] },
      other_grammar_structures: [],
    }),
  error_corrections: z.array(errorCorrection).default([]),
  coverage_check: z
    .object({
      paragraphs_detected: z.coerce.number().int().default(0),
      sentences_detected: z.coerce.number().int().default(0),
      sentences_reviewed: z.coerce.number().int().default(0),
      sentences_with_errors: z.coerce.number().int().default(0),
      sentences_without_errors: z.coerce.number().int().default(0),
      coverage_complete: z.boolean().default(false),
    })
    .default({
      paragraphs_detected: 0,
      sentences_detected: 0,
      sentences_reviewed: 0,
      sentences_with_errors: 0,
      sentences_without_errors: 0,
      coverage_complete: false,
    }),
  priority_improvement_plan: z
    .array(
      z.union([
        z.string(),
        z.object({
          priority: z.coerce.number().optional(),
          focus: z.string().optional(),
          action: z.string().optional(),
          criterion: z.string().optional(),
        }),
      ]),
    )
    .default([]),
  model_confidence: z.string().default(""),
  scoring_notes: z.string().default(""),
});

export type ScoringOutput = z.infer<typeof scoringOutputSchema>;
export type MajorCriterionOutput = z.infer<typeof majorCriterion>;
export type ErrorCorrectionOutput = z.infer<typeof errorCorrection>;
export type VocabItemOutput = z.infer<typeof vocabItem>;
export type SentenceItemOutput = z.infer<typeof sentenceItem>;
