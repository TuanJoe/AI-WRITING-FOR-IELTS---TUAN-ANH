"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/client/api";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.post("/api/auth/register", { name, email, password });
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="card w-full max-w-md p-8">
        <Link href="/" className="text-sm text-brand-600">
          ← Back home
        </Link>
        <h1 className="mt-4 text-2xl font-bold text-slate-900">
          Create your account
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Start scoring IELTS Writing essays in seconds.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label className="label">Name</label>
            <input
              type="text"
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
            />
          </div>
          <div>
            <label className="label">Email</label>
            <input
              type="email"
              required
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>
          <div>
            <label className="label">Password</label>
            <input
              type="password"
              required
              minLength={8}
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
            <p className="mt-1 text-xs text-slate-400">At least 8 characters.</p>
          </div>
          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-brand-600">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
