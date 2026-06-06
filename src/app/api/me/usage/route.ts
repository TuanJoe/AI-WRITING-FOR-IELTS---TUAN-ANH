import { requireUser } from "@/lib/auth/current-user";
import { ok, handleApiError } from "@/lib/api/response";
import { checkQuota } from "@/services/writing-submission-service";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const user = await requireUser();
    const quota = await checkQuota(user);
    const totalSubmissions = await prisma.writingSubmission.count({
      where: { userId: user.id },
    });
    return ok({
      dailyQuota: user.dailyQuota,
      monthlyQuota: user.monthlyQuota,
      ...quota,
      totalSubmissions,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
