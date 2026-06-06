import { requireUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db";
import { ok, fail, handleApiError } from "@/lib/api/response";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const submission = await prisma.writingSubmission.findUnique({
      where: { id },
      include: {
        scoringResult: { include: { errorCorrections: true } },
      },
    });
    if (!submission || submission.userId !== user.id) {
      return fail("Submission not found.", 404);
    }
    return ok(submission);
  } catch (err) {
    return handleApiError(err);
  }
}
