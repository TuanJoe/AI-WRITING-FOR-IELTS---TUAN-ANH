# AI IELTS Writing Scorer

A production-oriented web application where students submit IELTS Writing Task 1
or Task 2 essays and receive AI-generated, examiner-style band scoring, detailed
feedback, sentence-by-sentence error correction, vocabulary & grammar analysis,
and a prioritized improvement plan — powered by the **Google Gemini API**.

It also ships an **Admin CMS / AI operations control plane**: submission
explorer, prompt versioning & testing, token/cost analytics (USD + VND), model
pricing & exchange-rate management, RBAC, and audit logging.

---

## Tech stack

| Layer        | Choice                                                        |
| ------------ | ------------------------------------------------------------- |
| Framework    | Next.js 15 (App Router) · React 19 · TypeScript              |
| Styling      | Tailwind CSS                                                  |
| Database     | PostgreSQL · Prisma ORM                                       |
| Auth         | Custom JWT sessions (`jose`) in httpOnly cookies · bcrypt    |
| AI provider  | Gemini via `@google/genai`, behind an `AIProvider` interface |
| Validation   | Zod (input **and** strict AI-output schema)                  |
| Charts       | Recharts                                                      |

## Architecture principles

- **Provider abstraction** — business logic depends on `AIProvider`
  (`src/lib/ai/types.ts`), never the Gemini SDK directly. Adding another provider
  is a registry entry in `src/lib/ai/index.ts`.
- **Never trust the model** — every Gemini response is parsed (with one repair
  pass), validated against a strict Zod schema, and **all scores are recomputed
  server-side** from sub-criteria (`src/lib/scoring/`). Raw output is always
  persisted for debugging.
- **Prompts live in the database** (`AIPrompt`) and are edited in the CMS without
  redeploying. Every version is tracked through the lifecycle
  `DRAFT → TESTING → PUBLISHED → DEPRECATED → ARCHIVED`.
- **Everything is metered** — each AI call writes an `AIUsageLog` row with
  tokens, latency, model, prompt version and cost in USD + VND.
- **Cost is data, not code** — prices come from `AIModelPricing` (effective-dated)
  and `ExchangeRate`; historical cost rows are never mutated.
- **Security** — server-side auth + RBAC on every admin route, the Gemini key is
  server-only, student essays are wrapped in `<student_essay>` delimiters with a
  prompt-injection guard, sensitive admin actions are audit-logged, and basic
  rate limiting protects auth & submission endpoints.

## Project layout

```
prisma/
  schema.prisma          # all entities (section 7)
  seed.ts                # admin user, default prompt, pricing, FX, routing
  default-prompt.ts      # the production scoring prompt (section 17)
src/
  app/
    (student)/           # dashboard, writing/new, submissions, profile
    admin/               # dashboard, submissions, prompts, ai-usage, pricing, users, audit-logs
    api/                 # student + admin REST routes
  components/            # AppShell, report renderer, admin widgets
  lib/
    ai/                  # provider interface + Gemini impl + JSON repair
    auth/                # password, JWT session, RBAC, current-user
    ielts/               # criteria, sub-criteria, error-tag taxonomy
    scoring/             # band math + server-side normalization
    validation/          # Zod schemas (input + AI output)
    security/            # rate limiter
  services/              # scoring, submission, prompt, usage, cost, audit, analytics
  middleware.ts          # edge route protection
```

## Local setup

**Prerequisites:** Node.js 20+, a PostgreSQL database, a Gemini API key.

```bash
# 1. Install
npm install

# 2. Configure environment
cp .env.example .env        # fill DATABASE_URL, AUTH_SECRET, GEMINI_API_KEY

# 3. Create schema + seed
npx prisma migrate dev --name init
npm run db:seed

# 4. Run
npm run dev                 # http://localhost:3000
```

### Seeded accounts

| Role        | Email (default)                | Password      |
| ----------- | ------------------------------ | ------------- |
| SUPER_ADMIN | `admin@ielts-scorer.local`     | `ChangeMe123!`|
| STUDENT     | `student@ielts-scorer.local`   | `Student123!` |

Override admin credentials via `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`.

## AI scoring workflow (section 8)

1. Validate input, create `WritingSubmission` (`PENDING`), enforce quota.
2. Select the active `AIPrompt` and resolve the model (routing rule → prompt → env).
3. Render the template (student content wrapped in delimiters) and call Gemini
   through the provider (timeout + exponential-backoff retries).
4. Parse → repair → Zod-validate the JSON; recompute all bands server-side.
5. Persist `ScoringResult` + `ErrorCorrection[]`, write `AIUsageLog` with cost,
   mark the submission `COMPLETED`.
6. On failure: log a failed usage row, mark `FAILED`, don't charge quota, show a
   friendly error. Invalid output is saved raw for debugging.

## Roles (RBAC)

`STUDENT · TEACHER · SUPPORT · PRODUCT_ADMIN · FINANCE_ADMIN · SUPER_ADMIN`
— capabilities are defined in `src/lib/auth/rbac.ts` and enforced both in
middleware (coarse) and in every API route / admin page (authoritative).

## Deployment

- Frontend/API: Vercel (Next.js). Set all env vars from `.env.example`.
- Database: any managed PostgreSQL. Run `npm run prisma:deploy && npm run db:seed`.
- Scoring runs inline in the request today; the `scoring-service` contract is
  queue-ready, so it can move to a background worker without API changes.

> **Note:** scoring is synchronous in this MVP. For high volume, move
> `scoreSubmission` behind a queue (e.g. Redis/BullMQ) and poll the result route.
