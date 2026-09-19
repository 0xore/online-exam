import Link from "next/link";
import { AppShell, Panel, StatTile } from "@/components/shell";
import { isSupabaseConfigured } from "@/lib/env";

export default function HomePage() {
  const supabaseReady = isSupabaseConfigured();

  return (
    <AppShell
      brandHref="/"
      brandLabel="Examination"
      nav={
        <Link
          href="/admin"
          className="rounded-full bg-ink px-4 py-2 text-sm font-medium text-white"
        >
          Admin
        </Link>
      }
    >
      <Panel>
        <p className="text-sm text-muted">Good morning</p>
        <h1 className="mt-2 max-w-xl text-4xl font-semibold tracking-tight">
          Shared-link exams, ready for candidates
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-muted">
          One public URL, name and email only, and a server-controlled timer.
          MCQ papers show a result after lock. Mixed papers stay confirmation-only.
        </p>
      </Panel>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <StatTile
          label="Supabase"
          value={supabaseReady ? "Connected" : "Not ready"}
          tone="sky"
        />
        <StatTile label="Candidate link" value="Public" tone="blush" />
        <StatTile label="Admin" value="Protected" tone="gold" />
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Panel>
          <p className="text-sm text-muted">Practice papers</p>
          <h2 className="mt-1 text-xl font-semibold">Sit an exam</h2>
          <ul className="mt-4 space-y-3 text-sm leading-6">
            <li>
              <Link href="/e/practice-5min" className="font-medium text-ink underline decoration-sky decoration-2 underline-offset-4">
                Mixed practice
              </Link>
              <span className="text-muted"> — confirmation only after lock</span>
            </li>
            <li>
              <Link href="/e/practice-mcq" className="font-medium text-ink underline decoration-sky decoration-2 underline-offset-4">
                MCQ practice
              </Link>
              <span className="text-muted"> — automatic result after lock</span>
            </li>
          </ul>
        </Panel>
        <Panel>
          <p className="text-sm text-muted">Administrators</p>
          <h2 className="mt-1 text-xl font-semibold">Mark and export</h2>
          <p className="mt-3 text-sm leading-6 text-muted">
            Create papers, watch live auto-marks, and download CSV results.
          </p>
          <Link
            href="/admin"
            className="mt-5 inline-flex rounded-full bg-sky px-4 py-2.5 text-sm font-semibold text-ink"
          >
            Open dashboard
          </Link>
        </Panel>
      </div>
    </AppShell>
  );
}
