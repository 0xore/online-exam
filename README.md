# Online Examination Platform

Lightweight exam app for about 50 candidates. One public exam link is shared with everyone. Candidates enter their name and email, then sit an independent server-timed attempt.

Answer keys can be stored on questions. Objective and configured short-answer questions are marked as each answer is saved, and administrators can mark essays while an attempt is still in progress.

After submit or expiry, MCQ-only exams (single-choice, multiple-choice, and true/false) show the candidate their score and per-question result. Exams with short-answer or essay questions still show a confirmation only.

## Current stage

Stage 10: Production build, environment variables, Supabase setup, Vercel deployment, and custom-domain instructions.

## Local setup

1. Install [Node.js 20.9+](https://nodejs.org/).
2. Install dependencies with `npm install`.
3. Copy `.env.example` to `.env.local`.
4. Add the Supabase project URL and anon key from **Project Settings → API**.
5. Run `npm run dev` and open [http://localhost:3000](http://localhost:3000).

The first visitor to `/admin/login` can create the first administrator. That setup writes a confirmed Auth user and does not send email, so it is not blocked by Supabase email rate limits. Later sign-ups cannot become admins.

## Environment variables

| Name | Required | Where it is used |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Browser, Server Components, `proxy.ts`, and candidate RPCs |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Same places. RLS and RPCs enforce access |
| `SUPABASE_SERVICE_ROLE_KEY` | No | Unused by this app. Do not add it to Vercel |

`.env*` files are gitignored. Only `.env.example` is committed.

On Vercel, set the two required variables for **Production**, **Preview**, and **Development**. After changing `NEXT_PUBLIC_*` values, trigger a new deployment so they are baked into the client bundle.

## Supabase setup

This project already has a connected Supabase database. For a new environment, recreate that setup before deploying the app.

1. Create a Supabase project.
2. Apply every file in `supabase/migrations/` in filename order. The live project currently has:
   - `create_exam_schema`
   - `harden_functions`
   - `private_is_admin`
   - `admin_auth_and_public_exams`
   - `provision_first_admin`
   - `exam_types`
   - `candidate_attempt_start`
   - `candidate_exam_paper`
   - `fix_candidate_paper_question_id`
   - `attempt_clock_guard`
   - `candidate_mcq_results`
3. Optionally run `supabase/seed.sql` for the practice exams (`practice-5min`, `practice-mcq`, `stage9-random`).
4. Confirm **Authentication → Providers → Email** is enabled. Password sign-in is enough; candidate emails are not verified.
5. Set **Authentication → URL configuration**:
   - **Site URL** to the production origin, for example `https://exams.example.com`
   - **Redirect URLs** to `https://exams.example.com/**` and `http://localhost:3000/**`
6. Leave the service role key out of the web app. Candidates write only through `SECURITY DEFINER` RPCs. Administrators use Supabase Auth plus `private.is_admin()`.

Published exam metadata is readable by the public landing page. Questions, answer keys, attempts, and marks stay server-only.

## Production build

```bash
npm run build
npm run start
```

`npm run build` must succeed before a release. `npm run start` serves that build locally on port 3000 so you can smoke-test `/`, `/e/practice-mcq`, and `/admin/login` before deploying.

Other scripts:

- `npm run dev` — development server
- `npm run lint` — ESLint
- `npm test` — Stage 9 unit and live security checks

Live checks use the anon key from `.env.local` and expect the dev server at `http://127.0.0.1:3000` for admin redirect tests.

## Deploy to Vercel

The app needs a Node.js server (Server Components, Server Actions, and `src/proxy.ts`). Vercel is the default host.

1. Push this repository to GitHub.
2. In [Vercel](https://vercel.com), import the repo. Framework preset: **Next.js**.
3. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4. Deploy. The first production URL looks like `https://online-exam-xxxx.vercel.app`.
5. Open `/admin/login` on that URL and create the first administrator if the environment is new.
6. Create or publish a real exam, then share `/e/[slug]` with candidates.

Self-hosting also works: build on Node 20.9+, set the same two environment variables, and run `npm run start` behind HTTPS.

## Custom domain

1. In Vercel, open the project → **Settings → Domains** and add `exams.example.com`.
2. Create the DNS record Vercel shows, usually a `CNAME` to `cname.vercel-dns.com`.
3. Wait until the certificate is issued. Candidate cookies are `Secure` in production, so the site must be served over HTTPS.
4. Update Supabase **Site URL** and **Redirect URLs** to the custom domain.
5. Copy the public exam URL from the admin exam page again so candidates receive the custom-domain link.

Preview deployments can keep the `*.vercel.app` host in the Supabase redirect allow list.

## Go-live checklist

- [ ] `npm run build` succeeds
- [ ] Production env has the Supabase URL and anon key only
- [ ] Supabase Site URL matches the public origin
- [ ] First administrator can sign in at `/admin/login`
- [ ] A published exam opens at `/e/[slug]`
- [ ] Starting an attempt sets a countdown that does not reset on refresh
- [ ] After lock, an MCQ exam shows a result and a mixed exam does not
- [ ] `/admin` redirects to login when signed out
- [ ] Candidates are given the custom-domain exam link

## Routes

- `/` — project status and setup check
- `/e/practice-5min` — seeded 5-minute mixed practice exam
- `/e/practice-mcq` — seeded 5-minute MCQ practice exam
- `/e/stage9-random` — seeded randomised MCQ used by Stage 9 checks
- `/e/[slug]` — public exam landing page
- `/admin/login` — administrator sign-in or first-admin setup
- `/admin` — exam list
- `/admin/exams/new` — create an exam
- `/admin/exams/[id]` — edit exam, questions, marks and answer keys
- `/admin/exams/[id]/attempts` — live attempt list and scores
- `/admin/exams/[id]/attempts/[attemptId]` — mark answers, including essays
- `/admin/exams/[id]/attempts/export` — download attempt results CSV
