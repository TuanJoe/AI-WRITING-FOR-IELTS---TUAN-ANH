import { clearSessionCookie } from "@/lib/auth/session";
import { ok, handleApiError } from "@/lib/api/response";

export async function POST() {
  try {
    await clearSessionCookie();
    return ok({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
