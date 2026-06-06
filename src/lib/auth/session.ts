import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { Role } from "@prisma/client";
import { env } from "@/lib/env";

export const SESSION_COOKIE = "ielts_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

export interface SessionPayload {
  userId: string;
  email: string;
  role: Role;
}

function secretKey(): Uint8Array {
  return new TextEncoder().encode(env.authSecret);
}

export async function createSessionToken(
  payload: SessionPayload,
): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(secretKey());
}

export async function verifySessionToken(
  token: string,
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (
      typeof payload.userId === "string" &&
      typeof payload.email === "string" &&
      typeof payload.role === "string"
    ) {
      return {
        userId: payload.userId,
        email: payload.email,
        role: payload.role as Role,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: env.isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function readSessionFromCookies(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}
