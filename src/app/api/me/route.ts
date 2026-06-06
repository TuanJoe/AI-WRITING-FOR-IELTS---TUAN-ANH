import { requireUser } from "@/lib/auth/current-user";
import { isAdminRole } from "@/lib/auth/rbac";
import { ok, handleApiError } from "@/lib/api/response";

export async function GET() {
  try {
    const user = await requireUser();
    return ok({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      subscriptionPlan: user.subscriptionPlan,
      isAdmin: isAdminRole(user.role),
    });
  } catch (err) {
    return handleApiError(err);
  }
}
