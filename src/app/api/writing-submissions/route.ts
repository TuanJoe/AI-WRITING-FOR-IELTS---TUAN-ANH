import type { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db";
import { submissionSchema } from "@/lib/validation/input-schema";
import { ok, fail, handleApiError } from "@/lib/api/response";
import { rateLimit } from "@/lib/security/rate-limit";
import { createAndScoreSubmission } from "@/services/writing-submission-service";

export async function GET() {
  try {
    const user = await requireUser();
    const submissions = await prisma.writingSubmission.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        taskType: true,
        questionPrompt: true,
        wordCount: true,
        status: true,
        createdAt: true,
        scoringResult: { select: { overallBand: true } },
      },
    });
    return ok(submissions);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();

    // Prevent abusive repeated requests (section 23).
    const limit = rateLimit(`submit:${user.id}`, 10, 60_000);
    if (!limit.allowed)
      return fail("You're submitting too quickly. Please wait a moment.", 429);

    const body = await req.json();
    const input = submissionSchema.parse(body);

    const { submission, result } = await createAndScoreSubmission(user, input);

    return ok(
      {
        submissionId: submission.id,
        status: result.status,
        scoringResultId: result.scoringResultId,
        errorMessage: result.errorMessage,
      },
      201,
    );
  } catch (err) {
    return handleApiError(err);
  }
}
