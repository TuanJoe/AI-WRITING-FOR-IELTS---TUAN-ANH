import type { User } from "@prisma/client";
import { prisma } from "@/lib/db";
import { APP_CONFIG } from "@/lib/env";
import { countWords, type SubmissionInput } from "@/lib/validation/input-schema";
import { scoreSubmission } from "@/services/scoring-service";

// Creates submissions, enforces quota, and runs scoring (sections 8, 23).

export class QuotaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "QuotaError";
  }
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfMonth(): Date {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function checkQuota(user: User): Promise<{
  dailyUsed: number;
  monthlyUsed: number;
  dailyRemaining: number;
  monthlyRemaining: number;
}> {
  const [dailyUsed, monthlyUsed] = await Promise.all([
    prisma.writingSubmission.count({
      where: {
        userId: user.id,
        createdAt: { gte: startOfToday() },
        // System-side failures don't consume quota (section 8, rule 4).
        status: { not: "FAILED" },
      },
    }),
    prisma.writingSubmission.count({
      where: {
        userId: user.id,
        createdAt: { gte: startOfMonth() },
        status: { not: "FAILED" },
      },
    }),
  ]);
  return {
    dailyUsed,
    monthlyUsed,
    dailyRemaining: Math.max(0, user.dailyQuota - dailyUsed),
    monthlyRemaining: Math.max(0, user.monthlyQuota - monthlyUsed),
  };
}

export async function createAndScoreSubmission(
  user: User,
  input: SubmissionInput,
) {
  const wordCount = countWords(input.essayText);

  // Enforce quota before doing any AI work.
  const quota = await checkQuota(user);
  if (quota.dailyRemaining <= 0) {
    throw new QuotaError("Daily submission quota reached.");
  }
  if (quota.monthlyRemaining <= 0) {
    throw new QuotaError("Monthly submission quota reached.");
  }

  const min =
    input.taskType === "TASK_1"
      ? APP_CONFIG.essay.minWordsTask1
      : APP_CONFIG.essay.minWordsTask2;
  if (wordCount < min) {
    throw new QuotaError(
      `Essay is too short. Please write at least ${min} words.`,
    );
  }

  const submission = await prisma.writingSubmission.create({
    data: {
      userId: user.id,
      taskType: input.taskType,
      questionPrompt: input.questionPrompt,
      essayText: input.essayText,
      wordCount,
      status: "PENDING",
    },
  });

  // Run scoring inline (MVP). The architecture allows moving this to a queued
  // background worker without changing the service contract.
  const result = await scoreSubmission(submission, user);

  return { submission, result };
}
