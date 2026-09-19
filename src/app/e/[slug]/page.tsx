import Link from "next/link";
import { notFound } from "next/navigation";
import { StartForm } from "@/app/e/[slug]/start-form";
import { Eyebrow, Panel, StatTile } from "@/components/shell";
import { formatExamWindow } from "@/lib/admin/datetime";
import { getSessionAttempt } from "@/lib/candidate/session";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type ExamLandingPageProps = PageProps<"/e/[slug]">;

export default async function ExamLandingPage({ params }: ExamLandingPageProps) {
  const { slug } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: exam } = await supabase
    .from("exams")
    .select("title, slug, description, duration_minutes, available_from, available_until, published, exam_type")
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle();

  if (!exam) {
    notFound();
  }

  const session = await getSessionAttempt(slug);

  return (
    <div className="space-y-6">
      <Panel>
        <Eyebrow>Public exam</Eyebrow>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight">{exam.title}</h1>
        <p className="mt-3 text-sm text-muted">
          {formatExamWindow(exam.available_from, exam.available_until)}
        </p>
        {exam.description ? (
          <p className="mt-4 max-w-2xl whitespace-pre-wrap text-base leading-7 text-muted">
            {exam.description}
          </p>
        ) : null}
      </Panel>

      <div className="grid gap-4 md:grid-cols-3">
        <StatTile
          label="Paper type"
          value={exam.exam_type === "mcq" ? "MCQ" : "Mixed"}
          tone="sky"
        />
        <StatTile label="Duration" value={`${exam.duration_minutes} min`} tone="blush" />
        <StatTile
          label="Window"
          value={
            exam.available_from || exam.available_until ? "Limited" : "Open"
          }
          tone="gold"
        />
      </div>

      {session?.status === "active" ? (
        <Panel>
          <p className="text-sm leading-6">
            An attempt for {session.student_name} is already in progress on this
            device.
          </p>
          <Link
            href={`/e/${slug}/sit`}
            className="mt-4 inline-flex rounded-full bg-sky px-4 py-2.5 text-sm font-semibold text-ink"
          >
            Continue exam
          </Link>
        </Panel>
      ) : null}

      {session && session.status !== "active" ? (
        <Panel>
          <p className="text-sm leading-6">
            The attempt on this device has already{" "}
            {session.status === "expired" ? "expired" : "been submitted"}. Starting
            again with the same email is blocked.
          </p>
          {exam.exam_type === "mcq" ? (
            <Link
              href={`/e/${slug}/sit`}
              className="mt-4 inline-flex rounded-full bg-sky px-4 py-2.5 text-sm font-semibold text-ink"
            >
              View your results
            </Link>
          ) : null}
        </Panel>
      ) : null}

      <Panel className="max-w-xl">
        <h2 className="text-xl font-semibold">Enter your details</h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          No account is required. Your name and email identify this attempt.
        </p>
        <StartForm slug={exam.slug} />
      </Panel>
    </div>
  );
}
