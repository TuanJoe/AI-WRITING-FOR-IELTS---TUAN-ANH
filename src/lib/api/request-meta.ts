import type { NextRequest } from "next/server";

export function getRequestMeta(req: NextRequest): {
  ipAddress: string | null;
  userAgent: string | null;
} {
  const forwarded = req.headers.get("x-forwarded-for");
  const ipAddress = forwarded
    ? forwarded.split(",")[0].trim()
    : req.headers.get("x-real-ip");
  return {
    ipAddress: ipAddress ?? null,
    userAgent: req.headers.get("user-agent"),
  };
}
