import { cache } from "react";
import type { User } from "@prisma/client";
import { prisma } from "@/lib/db";
import { readSessionFromCookies } from "@/lib/auth/session";
import { hasPermission, type Permission } from "@/lib/auth/rbac";

// Resolve the authenticated user for the current request. Memoized per-request
// via React cache so multiple server components don't re-query.
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const session = await readSessionFromCookies();
  if (!session) return null;
  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user || !user.isActive) return null;
  return user;
});

export class AuthError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "AuthError";
  }
}

/** Require an authenticated user or throw a 401. */
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) throw new AuthError("Authentication required", 401);
  return user;
}

/** Require an authenticated user holding a specific permission or throw. */
export async function requirePermission(
  permission: Permission,
): Promise<User> {
  const user = await requireUser();
  if (!hasPermission(user.role, permission)) {
    throw new AuthError("Forbidden", 403);
  }
  return user;
}
