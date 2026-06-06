// Tiny typed fetch wrapper for client components. Unwraps the { data } / { error }
// envelope produced by the API routes.

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(
  method: string,
  url: string,
  body?: unknown,
): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  let json: unknown = null;
  try {
    json = await res.json();
  } catch {
    // non-JSON response (e.g. CSV export handled elsewhere)
  }

  if (!res.ok) {
    const err = (json as { error?: { message?: string; code?: string } })?.error;
    throw new ApiError(err?.message || "Request failed", res.status, err?.code);
  }
  return (json as { data: T }).data;
}

export const api = {
  get: <T>(url: string) => request<T>("GET", url),
  post: <T>(url: string, body?: unknown) => request<T>("POST", url, body),
  patch: <T>(url: string, body?: unknown) => request<T>("PATCH", url, body),
};
