import { GoogleGenAI } from "@google/genai";
import { env, APP_CONFIG } from "@/lib/env";
import {
  AIProvider,
  AIProviderError,
  type AIErrorClass,
  type ScoreWritingInput,
  type ScoreWritingOutput,
  type TokenUsage,
} from "@/lib/ai/types";

// Concrete Gemini implementation of the AIProvider interface. The API key is
// read server-side only and never reaches the client bundle.

function classifyError(err: unknown): { cls: AIErrorClass; retryable: boolean } {
  const message = (err instanceof Error ? err.message : String(err)).toLowerCase();
  if (message.includes("timeout") || message.includes("deadline")) {
    return { cls: "TIMEOUT", retryable: true };
  }
  if (message.includes("429") || message.includes("rate") || message.includes("quota")) {
    return { cls: "RATE_LIMIT", retryable: true };
  }
  if (message.includes("401") || message.includes("403") || message.includes("api key")) {
    return { cls: "AUTH", retryable: false };
  }
  if (message.includes("400") || message.includes("invalid")) {
    return { cls: "INVALID_REQUEST", retryable: false };
  }
  if (message.includes("500") || message.includes("503") || message.includes("unavailable")) {
    return { cls: "SERVER", retryable: true };
  }
  if (message.includes("network") || message.includes("fetch")) {
    return { cls: "NETWORK", retryable: true };
  }
  return { cls: "UNKNOWN", retryable: false };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Gemini request timeout after ${ms}ms`)),
      ms,
    );
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

export class GeminiProvider implements AIProvider {
  readonly name = "gemini";
  private client: GoogleGenAI;

  constructor(apiKey?: string) {
    this.client = new GoogleGenAI({ apiKey: apiKey ?? env.geminiApiKey });
  }

  async scoreWriting(input: ScoreWritingInput): Promise<ScoreWritingOutput> {
    return this.generate(input);
  }

  async testPrompt(input: ScoreWritingInput): Promise<ScoreWritingOutput> {
    return this.generate(input);
  }

  private async generate(input: ScoreWritingInput): Promise<ScoreWritingOutput> {
    const cfg = input.generationConfig ?? {};
    let lastError: unknown;

    for (let attempt = 0; attempt <= APP_CONFIG.ai.maxRetries; attempt++) {
      const start = Date.now();
      try {
        const response = await withTimeout(
          this.client.models.generateContent({
            model: input.modelName,
            contents: input.userPrompt,
            config: {
              systemInstruction: input.systemInstruction,
              temperature: cfg.temperature ?? 0.2,
              topP: cfg.topP ?? 0.8,
              topK: cfg.topK ?? 40,
              maxOutputTokens: cfg.maxOutputTokens ?? 8192,
              responseMimeType: cfg.responseMimeType ?? "application/json",
            },
          }),
          APP_CONFIG.ai.timeoutMs,
        );

        const latencyMs = Date.now() - start;
        const rawText = response.text ?? "";
        const usage = this.extractUsage(response);

        return {
          rawText,
          usage,
          latencyMs,
          modelName: input.modelName,
          requestId: (response as { responseId?: string }).responseId,
        };
      } catch (err) {
        lastError = err;
        const { retryable } = classifyError(err);
        if (!retryable || attempt === APP_CONFIG.ai.maxRetries) break;
        // Exponential backoff: 1s, 2s, ...
        await delay(1000 * 2 ** attempt);
      }
    }

    const { cls, retryable } = classifyError(lastError);
    throw new AIProviderError(
      lastError instanceof Error ? lastError.message : "Gemini request failed",
      cls,
      retryable,
      lastError,
    );
  }

  private extractUsage(response: unknown): TokenUsage {
    const meta =
      (response as { usageMetadata?: Record<string, number> }).usageMetadata ??
      {};
    const inputTokens = meta.promptTokenCount ?? 0;
    const outputTokens = meta.candidatesTokenCount ?? 0;
    const cachedInputTokens = meta.cachedContentTokenCount ?? 0;
    const thinkingTokens = meta.thoughtsTokenCount ?? 0;
    const totalTokens =
      meta.totalTokenCount ??
      inputTokens + outputTokens + cachedInputTokens + thinkingTokens;
    return {
      inputTokens,
      outputTokens,
      cachedInputTokens,
      thinkingTokens,
      totalTokens,
    };
  }
}
