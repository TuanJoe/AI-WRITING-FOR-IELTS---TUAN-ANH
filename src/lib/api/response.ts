import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AuthError } from "@/lib/auth/current-user";
import { QuotaError } from "@/services/writing-submission-service";

// Consistent JSON envelopes + centralized error handling for API routes.

export function ok<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ data }, { status });
}

export function fail(message: string, status = 400, code?: string): NextResponse {
  return NextResponse.json({ error: { message, code } }, { status });
}

export function handleApiError(err: unknown): NextResponse {
  if (err instanceof ZodError) {
    return NextResponse.json(
      {
        error: {
          message: "Validation failed",
          code: "VALIDATION_ERROR",
          issues: err.flatten(),
        },
      },
      { status: 422 },
    );
  }
  if (err instanceof AuthError) {
    return fail(err.message, err.status, "AUTH");
  }
  if (err instanceof QuotaError) {
    return fail(err.message, 429, "QUOTA");
  }
  console.error("[api] Unhandled error:", err);
  return fail("Something went wrong. Please try again.", 500, "INTERNAL");
}
