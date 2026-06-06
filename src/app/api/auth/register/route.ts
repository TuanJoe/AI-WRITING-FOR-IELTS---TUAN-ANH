import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { registerSchema } from "@/lib/validation/input-schema";
import { hashPassword } from "@/lib/auth/password";
import {
  createSessionToken,
  setSessionCookie,
} from "@/lib/auth/session";
import { ok, fail, handleApiError } from "@/lib/api/response";
import { rateLimit } from "@/lib/security/rate-limit";
import { getRequestMeta } from "@/lib/api/request-meta";

export async function POST(req: NextRequest) {
  try {
    const { ipAddress } = getRequestMeta(req);
    const limit = rateLimit(`register:${ipAddress ?? "unknown"}`, 5, 60_000);
    if (!limit.allowed) return fail("Too many attempts. Try again later.", 429);

    const body = await req.json();
    const input = registerSchema.parse(body);

    const existing = await prisma.user.findUnique({
      where: { email: input.email },
    });
    if (existing) return fail("An account with this email already exists.", 409);

    const user = await prisma.user.create({
      data: {
        email: input.email,
        name: input.name,
        passwordHash: await hashPassword(input.password),
        authProvider: "credentials",
        role: "STUDENT",
        lastLoginAt: new Date(),
      },
    });

    const token = await createSessionToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });
    await setSessionCookie(token);

    return ok(
      { id: user.id, email: user.email, name: user.name, role: user.role },
      201,
    );
  } catch (err) {
    return handleApiError(err);
  }
}
