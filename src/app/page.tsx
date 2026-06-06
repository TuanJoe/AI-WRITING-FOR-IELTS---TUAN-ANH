import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/current-user";
import { isAdminRole } from "@/lib/auth/rbac";

const FEATURES = [
  {
    title: "Official 4-criteria scoring",
    body: "Band scores for Task Achievement/Response, Coherence & Cohesion, Lexical Resource and Grammatical Range — recomputed server-side from every sub-criterion.",
  },
  {
    title: "Sentence-by-sentence corrections",
    body: "Tagged error corrections with severity, the original vs. corrected text, an explanation and a suggested learning focus.",
  },
  {
    title: "Vocabulary & structure analysis",
    body: "Topic-specific and academic vocabulary, collocations, plus a full breakdown of your sentence types and grammar structures.",
  },
  {
    title: "A priority improvement plan",
    body: "Know exactly what to fix next, ranked by impact on your overall band.",
  },
];

export default async function LandingPage() {
  const user = await getCurrentUser();
  const ctaHref = user ? "/dashboard" : "/register";

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-50 to-white">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="text-lg font-bold text-brand-700">
          AI IELTS Writing Scorer
        </div>
        <nav className="flex items-center gap-3 text-sm">
          {user ? (
            <>
              {isAdminRole(user.role) && (
                <Link href="/admin/dashboard" className="text-slate-600 hover:text-slate-900">
                  Admin
                </Link>
              )}
              <Link href="/dashboard" className="btn-primary">
                Go to dashboard
              </Link>
            </>
          ) : (
            <>
              <Link href="/login" className="text-slate-600 hover:text-slate-900">
                Log in
              </Link>
              <Link href="/register" className="btn-primary">
                Get started
              </Link>
            </>
          )}
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-6">
        <section className="py-16 text-center">
          <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            Get an examiner-grade IELTS Writing score in seconds
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-600">
            Submit your Task 1 or Task 2 essay and receive a detailed band score,
            error corrections, vocabulary and grammar analysis, and a clear plan
            to improve — powered by Google Gemini.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Link href={ctaHref} className="btn-primary px-6 py-3 text-base">
              {user ? "Open dashboard" : "Score my essay free"}
            </Link>
            <Link href="/login" className="btn-secondary px-6 py-3 text-base">
              I have an account
            </Link>
          </div>
        </section>

        <section className="grid gap-6 pb-20 sm:grid-cols-2">
          {FEATURES.map((f) => (
            <div key={f.title} className="card p-6">
              <h3 className="text-lg font-semibold text-slate-900">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                {f.body}
              </p>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t border-slate-200 py-6 text-center text-sm text-slate-500">
        AI IELTS Writing Scorer · Built for serious test preparation
      </footer>
    </div>
  );
}
