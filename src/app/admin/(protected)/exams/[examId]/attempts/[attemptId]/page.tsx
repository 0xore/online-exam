import Link from "next/link";
import { notFound } from "next/navigation";
import { MarkForm } from "@/app/admin/(protected)/exams/[examId]/attempts/mark-form";
import {
  asOptions,
  formatCorrectAnswer,
  formatSelectedAnswer,
} from "@/lib/admin/answers";
import { formatScore } from "@/lib/admin/scores";
import { requireAdmin } from "@/lib/admin/require-admin";
import type { Json } from "@/lib/supabase/database.types";

type AttemptPageProps = PageProps<"/admin/exams/[examId]/attempts/[attemptId]">;

export default async function MarkAttemptPage({ params }: AttemptPageProps) {
  const { examId, attemptId } = await params;
  const { supabase } = await requireAdmin();

  const { data: exam } = await supabase
    .from("exams")
    .select("id, title, exam_type, pass_mark")
    .eq("id", examId)
    .maybeSingle();

  const { data: attempt } = await supabase
    .from("attempts")
    .select("*")
    .eq("id", attemptId)
    .eq("exam_id", examId)
    .maybeSingle();

  if (!exam || !attempt) {
    notFound();
  }

  const { data: questions } = await supabase
    .from("questions")
    .select("*")
    .eq("exam_id", examId)
    .order("position", { ascending: true });

  const { data: answers } = await supabase
    .from("answers")
    .select("*")
    .eq("attempt_id", attemptId);

  const answersByQuestion = new Map(
    (answers ?? []).map((answer) => [answer.question_id, answer]),
  );
  const orderedIds = attempt.question_order ?? [];
  const orderedQuestions = [
    ...orderedIds
      .map((id) => (questions ?? []).find((question) => question.id === id))
      .filter((question): question is NonNullable<typeof question> => Boolean(question)),
    ...(questions ?? []).filter((question) => !orderedIds.includes(question.id)),
  ];

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-medium uppercase tracking-wider text-muted">
          {attempt.status === "active" ? "Live attempt" : "Locked attempt"}
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          {attempt.student_name}
        </h1>
        <p className="mt-2 text-sm text-muted">
          {attempt.student_email} · {exam.title} · {attempt.status}
        </p>
        <p className="mt-3 text-sm">
          Auto {formatScore(attempt.auto_score)} · Manual{" "}
          {formatScore(attempt.manual_score)} · Final{" "}
          {formatScore(attempt.final_score)}
          {exam.pass_mark != null ? ` · Pass mark ${formatScore(exam.pass_mark)}` : ""}
        </p>
        <p className="mt-4">
          <Link
            href={`/admin/exams/${exam.id}/attempts`}
            className="text-sm font-semibold underline decoration-sky decoration-2 underline-offset-4"
          >
            Back to attempts
          </Link>
        </p>
      </div>

      {orderedQuestions.map((question, index) => {
        const answer = answersByQuestion.get(question.id);
        const options = asOptions(question.options);
        const written =
          question.type === "short_answer" || question.type === "long_answer";

        return (
          <article
            key={question.id}
            className="rounded-[28px] bg-card p-6 shadow-[0_18px_50px_rgba(16,16,17,0.06)]"
          >
            <p className="text-sm font-medium text-muted">
              Question {index + 1} · {question.type.replaceAll("_", " ")} ·{" "}
              {formatScore(question.marks)} marks
            </p>
            <h2 className="mt-2 whitespace-pre-wrap text-lg font-semibold leading-7">
              {question.question_text}
            </h2>
            <div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
              <p>
                <span className="font-medium">Candidate: </span>
                {formatSelectedAnswer((answer?.answer ?? null) as Json | null, options)}
              </p>
              <p>
                <span className="font-medium">Key: </span>
                {formatCorrectAnswer(
                  question.correct_answer,
                  question.acceptable_answers,
                  options,
                )}
              </p>
              <p>
                <span className="font-medium">Auto: </span>
                {formatScore(answer?.auto_marks ?? null)}
              </p>
              <p>
                <span className="font-medium">Manual: </span>
                {formatScore(answer?.manual_marks ?? null)}
              </p>
            </div>
            {answer ? (
              <MarkForm
                examId={exam.id}
                attemptId={attempt.id}
                answerId={answer.id}
                maxMarks={Number(question.marks)}
                manualMarks={answer.manual_marks}
                comment={answer.marker_comment}
              />
            ) : (
              <p className="mt-4 text-sm text-muted">
                {written
                  ? "No written answer saved yet. You can mark it when it arrives."
                  : "No answer saved yet."}
              </p>
            )}
          </article>
        );
      })}
    </section>
  );
}
