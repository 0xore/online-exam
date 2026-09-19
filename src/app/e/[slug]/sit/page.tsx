import Link from "next/link";
import { redirect } from "next/navigation";
import { ExamPaper } from "@/app/e/[slug]/sit/exam-paper";
import { McqResult } from "@/app/e/[slug]/sit/mcq-result";
import { Eyebrow, Panel } from "@/components/shell";
import { getAttemptToken } from "@/lib/candidate/cookie";
import { getSessionPaper, getSessionResult } from "@/lib/candidate/session";

type SitPageProps = PageProps<"/e/[slug]/sit">;

export default async function SitPage({ params }: SitPageProps) {
  const { slug } = await params;
  const token = await getAttemptToken(slug);
  const { paper, error } = await getSessionPaper(slug);

  if (!token || (!paper && !error)) {
    redirect(`/e/${slug}`);
  }

  if (!paper) {
    return (
      <Panel>
        <h1 className="text-3xl font-semibold tracking-tight">Could not load exam</h1>
        <p className="mt-3 text-base leading-7 text-muted">
          {error ?? "The paper could not be opened. Go back and resume the attempt."}
        </p>
        <p className="mt-8">
          <Link href={`/e/${slug}`} className="text-sm font-medium underline decoration-sky decoration-2 underline-offset-4">
            Back to exam details
          </Link>
        </p>
      </Panel>
    );
  }

  const locked = paper.status !== "active";
  const result =
    locked && paper.exam_type === "mcq" ? await getSessionResult(slug) : null;

  return (
    <Panel>
      <Eyebrow>{locked ? "Attempt locked" : "Good luck"}</Eyebrow>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">
        {paper.exam_title}
      </h1>
      <p className="mt-3 text-sm text-muted">
        {paper.student_name} · {paper.exam_type === "mcq" ? "MCQ" : "Mixed"} ·{" "}
        {paper.duration_minutes} minutes
      </p>

      {locked ? (
        <div className="mt-6 space-y-3">
          <p className="text-base leading-7">
            This attempt has {paper.status === "expired" ? "expired" : "been submitted"}.
            Further answers cannot be changed.
          </p>
          <p className="text-sm leading-6 text-muted">
            {paper.exam_type === "mcq"
              ? "This MCQ exam can show your automatic score and the correct options."
              : "Because this is a mixed exam, you will see a confirmation only. Scores stay hidden."}
          </p>
        </div>
      ) : null}

      {locked && paper.exam_type === "mcq" && result?.result ? (
        <McqResult result={result.result} />
      ) : (
        <ExamPaper slug={slug} paper={paper} />
      )}

      <p className="mt-8">
        <Link href={`/e/${slug}`} className="text-sm font-medium underline decoration-sky decoration-2 underline-offset-4">
          Back to exam details
        </Link>
      </p>
    </Panel>
  );
}
