// IELTS Writing scoring criteria, sub-criteria and the approved error-tag
// taxonomy. Single source of truth used by scoring, validation and the UI.

export const SUBCRITERIA = {
  taskAchievement: ["overview", "key_features", "data_support"] as const,
  taskResponse: [
    "addressing_the_prompt",
    "idea_development",
    "main_thesis_statement",
    "format",
  ] as const,
  coherenceAndCohesion: [
    "flow_of_ideas",
    "cohesive_devices",
    "transition",
    "paragraphing",
  ] as const,
  lexicalResource: ["range_of_vocabulary", "accuracy", "spelling"] as const,
  grammaticalRangeAndAccuracy: [
    "range_of_structures",
    "accuracy",
    "punctuation",
  ] as const,
};

export const MAJOR_CRITERIA = {
  TASK_1: [
    "task_achievement",
    "coherence_and_cohesion",
    "lexical_resource",
    "grammatical_range_and_accuracy",
  ] as const,
  TASK_2: [
    "task_response",
    "coherence_and_cohesion",
    "lexical_resource",
    "grammatical_range_and_accuracy",
  ] as const,
};

// Approved error tag taxonomy (section 14). Grouped for the admin UI.
export const ERROR_TAGS = {
  taskAchievementOrResponse: [
    "MISSING_OVERVIEW",
    "UNCLEAR_OVERVIEW",
    "INACCURATE_OVERVIEW",
    "MISSING_KEY_FEATURE",
    "IRRELEVANT_DETAIL",
    "INSUFFICIENT_DATA_SUPPORT",
    "INACCURATE_DATA",
    "OVER_REPORTING_MINOR_DETAILS",
    "UNDER_REPORTING_MAIN_TRENDS",
    "OFF_TOPIC_RESPONSE",
    "PARTIALLY_ADDRESSED_PROMPT",
    "UNADDRESSED_PROMPT_PART",
    "WEAK_THESIS",
    "UNCLEAR_POSITION",
    "UNDERDEVELOPED_IDEA",
    "UNSUPPORTED_CLAIM",
    "WEAK_EXAMPLE",
    "INAPPROPRIATE_FORMAT",
    "MISSING_CONCLUSION",
  ],
  coherenceAndCohesion: [
    "UNCLEAR_IDEA_FLOW",
    "ILLOGICAL_SEQUENCE",
    "WEAK_PARAGRAPHING",
    "OVERLONG_PARAGRAPH",
    "UNDERDEVELOPED_PARAGRAPH",
    "NO_CLEAR_TOPIC_SENTENCE",
    "MECHANICAL_COHESION",
    "OVERUSED_CONNECTOR",
    "WRONG_CONNECTOR",
    "MISSING_TRANSITION",
    "ABRUPT_TRANSITION",
    "UNCLEAR_REFERENCE",
    "REPETITIVE_REFERENCE",
    "COHESIVE_DEVICE_ERROR",
  ],
  lexicalResource: [
    "LIMITED_VOCABULARY",
    "WORD_CHOICE_ERROR",
    "COLLOCATION_ERROR",
    "WORD_FORM_ERROR",
    "REGISTER_ERROR",
    "REPETITION",
    "INAPPROPRIATE_ACADEMIC_WORD",
    "INACCURATE_TOPIC_WORD",
    "SPELLING_ERROR",
    "AWKWARD_EXPRESSION",
    "UNNATURAL_PHRASE",
    "OVERGENERAL_WORDING",
  ],
  grammarAndPunctuation: [
    "SUBJECT_VERB_AGREEMENT",
    "TENSE_ERROR",
    "ARTICLE_ERROR",
    "PREPOSITION_ERROR",
    "PLURAL_SINGULAR_ERROR",
    "WORD_ORDER_ERROR",
    "SENTENCE_FRAGMENT",
    "RUN_ON_SENTENCE",
    "COMMA_SPLICE",
    "CLAUSE_STRUCTURE_ERROR",
    "RELATIVE_CLAUSE_ERROR",
    "CONDITIONAL_ERROR",
    "PASSIVE_VOICE_ERROR",
    "MODAL_VERB_ERROR",
    "GERUND_INFINITIVE_ERROR",
    "PUNCTUATION_ERROR",
    "COMMA_ERROR",
    "CAPITALIZATION_ERROR",
    "APOSTROPHE_ERROR",
    "PARALLELISM_ERROR",
    "PRONOUN_ERROR",
    "DETERMINER_ERROR",
  ],
};

export const ALL_ERROR_TAGS: string[] = [
  ...ERROR_TAGS.taskAchievementOrResponse,
  ...ERROR_TAGS.coherenceAndCohesion,
  ...ERROR_TAGS.lexicalResource,
  ...ERROR_TAGS.grammarAndPunctuation,
];

export const SENTENCE_TYPES = [
  "simple_sentence",
  "compound_sentence",
  "complex_sentence",
  "compound_complex_sentence",
] as const;

export const VOCAB_CATEGORIES = [
  "topic_specific_vocabulary",
  "academic_vocabulary",
  "collocations",
] as const;

export const ACCURACY_STATUSES = [
  "accurate",
  "partially_accurate",
  "inaccurate",
] as const;

export const SEVERITIES = ["low", "medium", "high"] as const;

// Human-readable labels for major criteria in the UI.
export const CRITERION_LABELS: Record<string, string> = {
  task_achievement: "Task Achievement",
  task_response: "Task Response",
  coherence_and_cohesion: "Coherence & Cohesion",
  lexical_resource: "Lexical Resource",
  grammatical_range_and_accuracy: "Grammatical Range & Accuracy",
};
