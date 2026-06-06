import { z } from "zod";
import { APP_CONFIG } from "@/lib/env";

// Server-side validation for all user-supplied input (section 23).

export const registerSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  password: z.string().min(8, "Password must be at least 8 characters").max(200),
  name: z.string().min(1).max(120).optional(),
});

export const loginSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  password: z.string().min(1).max(200),
});

export const submissionSchema = z.object({
  taskType: z.enum(["TASK_1", "TASK_2"]),
  questionPrompt: z
    .string()
    .trim()
    .min(1, "Question prompt is required")
    .max(5000),
  essayText: z
    .string()
    .trim()
    .min(1, "Essay text is required")
    .max(APP_CONFIG.essay.maxChars, "Essay exceeds the maximum length"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type SubmissionInput = z.infer<typeof submissionSchema>;

/** Count words server-side — never trust a client-provided word count. */
export function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}
