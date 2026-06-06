import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { loginSchema } from "@/lib/validation/input-schema";
import { verifyPassword } from "@/lib/auth/password";
import { createSessionToken, setSessionCookie } from "@/lib/auth/session";
import { ok, fail, handleApiError } from "@/lib/api/response";
import { rateLimit } from "@/lib/security/rate-limit";
import { getRequestMeta } from "@/lib/api/request-meta";
import { isAdminRole } from "@/lib/auth/rbac";
import { recordAudit } from "@/services/audit-service";

export async function POST(req: NextRequest) {
  try {
    const meta = getRequestMeta(req);
    const limit = rateLimit(`login:${meta.ipAddress ?? "unknown"}`, 10, 60_000);
    if (!limit.allowed) return fail("Too many attempts. Try again later.", 429);

    const body = await req.json();
    const input = loginSchema.parse(body);

    const user = await prisma.user.findUnique({ where: { email: input.email } });
    // Generic message — don't reveal whether the email exists.
    const invalid = () => fail("Invalid email or password.", 401);
    if (!user || !user.passwordHash) return invalid();
    if (!user.isActive) return fail("This account has been disabled.", 403);

    const valid = await verifyPassword(input.password, user.passwordHash);
    if (!valid) return invalid();

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const token = await createSessionToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });
    await setSessionCookie(token);

    // Audit admin logins (section 19.6).
    if (isAdminRole(user.role)) {
      await recordAudit({
        adminUserId: user.id,
        action: "ADMIN_LOGIN",
        entityType: "User",
        entityId: user.id,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
      });
    }

    return ok({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isAdmin: isAdminRole(user.role),
    });
  } catch (err) {
    return handleApiError(err);
  }
}
