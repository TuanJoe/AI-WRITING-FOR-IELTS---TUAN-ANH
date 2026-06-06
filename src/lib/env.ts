// Centralized, validated access to environment variables.
// Importing this module on the client would leak nothing — all reads are
// guarded so secrets are only resolved on the server.

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  get databaseUrl() {
    return required("DATABASE_URL");
  },
  get authSecret() {
    return required("AUTH_SECRET");
  },
  get geminiApiKey() {
    return required("GEMINI_API_KEY");
  },
  geminiDefaultModel: process.env.GEMINI_DEFAULT_MODEL || "gemini-2.5-flash",
  isProduction: process.env.NODE_ENV === "production",
};

export const APP_CONFIG = {
  // Server-side limits for essay submission validation.
  essay: {
    maxChars: 12000,
    minWordsTask1: 50,
    minWordsTask2: 100,
    recommendedMinTask1: 150,
    recommendedMinTask2: 250,
  },
  ai: {
    timeoutMs: 90_000,
    maxRetries: 2,
  },
};
