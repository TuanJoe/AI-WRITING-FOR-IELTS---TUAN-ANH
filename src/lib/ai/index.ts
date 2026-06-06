import type { AIProvider } from "@/lib/ai/types";
import { GeminiProvider } from "@/lib/ai/providers/gemini";

// Provider registry / factory. Add new providers here as they're implemented.
const providers: Record<string, () => AIProvider> = {
  gemini: () => new GeminiProvider(),
};

export function getProvider(name: string): AIProvider {
  const factory = providers[name.toLowerCase()];
  if (!factory) {
    throw new Error(`Unknown AI provider: ${name}`);
  }
  return factory();
}

export * from "@/lib/ai/types";
