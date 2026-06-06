// Provider-agnostic AI abstraction (section 10). Business logic depends on this
// interface, never on a concrete SDK, so a second provider can be added later.

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens: number;
  thinkingTokens: number;
  totalTokens: number;
}

export interface GenerationConfig {
  temperature?: number;
  topP?: number;
  topK?: number;
  maxOutputTokens?: number;
  responseMimeType?: string;
}

export interface ScoreWritingInput {
  modelName: string;
  systemInstruction: string;
  userPrompt: string;
  generationConfig?: GenerationConfig;
}

export interface ScoreWritingOutput {
  /** Raw text returned by the model (persisted for debugging). */
  rawText: string;
  usage: TokenUsage;
  latencyMs: number;
  modelName: string;
  requestId?: string;
}

export type PromptTestInput = ScoreWritingInput;
export type PromptTestOutput = ScoreWritingOutput;

export interface AIProvider {
  readonly name: string;
  scoreWriting(input: ScoreWritingInput): Promise<ScoreWritingOutput>;
  testPrompt(input: PromptTestInput): Promise<PromptTestOutput>;
}

export type AIErrorClass =
  | "TIMEOUT"
  | "RATE_LIMIT"
  | "AUTH"
  | "INVALID_REQUEST"
  | "SERVER"
  | "NETWORK"
  | "UNKNOWN";

export class AIProviderError extends Error {
  constructor(
    message: string,
    public errorClass: AIErrorClass,
    public retryable: boolean,
    public cause?: unknown,
  ) {
    super(message);
    this.name = "AIProviderError";
  }
}
