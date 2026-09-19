import Link from "next/link";
import { notFound } from "next/navigation";
import { formatScore } from "@/lib/admin/scores";
import { requireAdmin } from "@/lib/admin/require-admin";

type AttemptsPageProps = PageProps<"/admin/exams/[examId]/attempts">;

function statusLabel(status: string, expiresAt: string) {
  if (status === "active" && Date.parse(expiresAt) <= Date.now()) {
    return "expired";
  }

  return status;
}

export default async function ExamAttemptsPage({ params }: AttemptsPageProps) {
  const { examId } = await params;
  const { supabase } = await requireAdmin();
  const { data: exam } = await supabase
    .from("exams")
    .select("id, title, exam_type, pass_mark")
    .eq("id", examId)
    .maybeSingle();

  if (!exam) {
    notFound();
  }

  await supabase
    .from("attempts")
    .update({
      status: "expired",
      submitted_at: new Date().toISOString(),
    })
    .eq("exam_id", examId)
    .eq("status", "active")
    .lte("expires_at", new Date().toISOString())
    .select("id");

  const { data: attempts } = await supabase
    .from("attempts")
    .select(
      "id, student_name, student_email, status, started_at, expires_at, submitted_at, auto_score, manual_score, final_score, answers(count)",
    )
    .eq("exam_id", examId)
    .order("started_at", { ascending: false });

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-medium uppercase tracking-wider text-muted">
          Live marking
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">{exam.title}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
          Auto-marks update as answers are saved. You can assign manual marks
          while an attempt is still in progress. Candidates do not see scores
          during the exam. After lock, MCQ candidates see their automatic
          result.
        </p>
        <div className="mt-4 flex flex-wrap gap-4">
          <Link
            href={`/admin/exams/${exam.id}`}
            className="text-sm font-semibold underline decoration-sky decoration-2 underline-offset-4"
          >
            Back to exam
          </Link>
          <a
            href={`/admin/exams/${exam.id}/attempts/export`}
            className="text-sm font-semibold underline decoration-sky decoration-2 underline-offset-4"
          >
            Download CSV
          </a>
        </div>
      </div>

      {(attempts ?? []).length === 0 ? (
        <p className="rounded-[28px] bg-card px-5 py-6 text-sm text-muted shadow-[0_18px_50px_rgba(16,16,17,0.06)]">
          No attempts yet.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-[28px] bg-card shadow-[0_18px_50px_rgba(16,16,17,0.06)]">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-border text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Candidate</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Auto</th>
                <th className="px-4 py-3 font-medium">Manual</th>
                <th className="px-4 py-3 font-medium">Final</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {(attempts ?? []).map((attempt) => {
                const answered = Array.isArray(attempt.answers)
                  ? (attempt.answers[0]?.count ?? 0)
                  : 0;
                const status = statusLabel(attempt.status, attempt.expires_at);
                return (
                  <tr key={attempt.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3">
                      <p className="font-medium">{attempt.student_name}</p>
                      <p className="text-muted">{attempt.student_email}</p>
                      <p className="text-xs text-muted">{answered} answers saved</p>
                    </td>
                    <td className="px-4 py-3 capitalize">{status}</td>
                    <td className="px-4 py-3">{formatScore(attempt.auto_score)}</td>
                    <td className="px-4 py-3">{formatScore(attempt.manual_score)}</td>
                    <td className="px-4 py-3">
                      {formatScore(attempt.final_score)}
                      {exam.pass_mark != null && attempt.final_score != null
                        ? Number(attempt.final_score) >= Number(exam.pass_mark)
                          ? " · Pass"
                          : " · Fail"
                        : null}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/exams/${exam.id}/attempts/${attempt.id}`}
                        className="font-semibold underline decoration-sky decoration-2 underline-offset-4"
                      >
                        Mark
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
