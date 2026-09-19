import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteExamAction, updateExamAction } from "@/app/admin/actions";
import {
  createQuestionAction,
  deleteQuestionAction,
  moveQuestionAction,
  updateQuestionAction,
} from "@/app/admin/question-actions";
import { CopyExamUrl } from "@/app/admin/(protected)/exams/copy-exam-url";
import { ExamForm } from "@/app/admin/(protected)/exams/exam-form";
import { QuestionForm } from "@/app/admin/(protected)/exams/question-form";
import { isExamType } from "@/lib/admin/exam-kind";
import { requireAdmin } from "@/lib/admin/require-admin";

type ExamPageProps = PageProps<"/admin/exams/[examId]">;

export default async function EditExamPage({ params }: ExamPageProps) {
  const { examId } = await params;
  const { supabase } = await requireAdmin();
  const { data: exam } = await supabase
    .from("exams")
    .select("*")
    .eq("id", examId)
    .maybeSingle();

  if (!exam) {
    notFound();
  }

  const { data: questions } = await supabase
    .from("questions")
    .select("*")
    .eq("exam_id", examId)
    .order("position", { ascending: true });

  return (
    <div className="space-y-8">
      <section className="rounded-[28px] bg-card p-8 shadow-[0_18px_50px_rgba(16,16,17,0.06)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-wider text-muted">
              Edit {exam.exam_type === "mcq" ? "MCQ" : "mixed"} exam
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">{exam.title}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={`/admin/exams/${exam.id}/attempts`}
              className="text-sm font-semibold underline decoration-sky decoration-2 underline-offset-4"
            >
              Mark attempts
            </Link>
            <CopyExamUrl slug={exam.slug} />
          </div>
        </div>
        <div className="mt-6">
          <ExamForm
            exam={exam}
            action={updateExamAction.bind(null, exam.id)}
            submitLabel="Save exam"
          />
        </div>
        <form action={deleteExamAction.bind(null, exam.id)} className="mt-6">
          <button
            type="submit"
            className="text-sm font-medium text-red-700 hover:underline"
          >
            Delete exam
          </button>
        </form>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold tracking-tight">Questions</h2>
        {(questions ?? []).map((question, index) => (
          <article
            key={question.id}
            className="rounded-[28px] bg-card p-6 shadow-[0_18px_50px_rgba(16,16,17,0.06)]"
          >
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-medium text-muted">
                Question {question.position} · {question.type.replaceAll("_", " ")}
              </p>
              <div className="flex gap-2">
                <form action={moveQuestionAction.bind(null, exam.id, question.id, "up")}>
                  <button
                    type="submit"
                    disabled={index === 0}
                    className="rounded-lg border border-border px-2 py-1 text-sm disabled:opacity-40"
                  >
                    Up
                  </button>
                </form>
                <form
                  action={moveQuestionAction.bind(null, exam.id, question.id, "down")}
                >
                  <button
                    type="submit"
                    disabled={index === (questions?.length ?? 0) - 1}
                    className="rounded-lg border border-border px-2 py-1 text-sm disabled:opacity-40"
                  >
                    Down
                  </button>
                </form>
                <form action={deleteQuestionAction.bind(null, exam.id, question.id)}>
                  <button type="submit" className="rounded-lg px-2 py-1 text-sm text-red-700">
                    Delete
                  </button>
                </form>
              </div>
            </div>
            <QuestionForm
              question={question}
              examType={isExamType(exam.exam_type) ? exam.exam_type : "mixed"}
              action={updateQuestionAction.bind(null, exam.id, question.id)}
              submitLabel="Save question"
            />
          </article>
        ))}

        <article className="rounded-[28px] bg-card p-6 shadow-[0_18px_50px_rgba(16,16,17,0.06)]">
          <h3 className="text-lg font-semibold">Add question</h3>
          <div className="mt-4">
            <QuestionForm
              examType={isExamType(exam.exam_type) ? exam.exam_type : "mixed"}
              action={createQuestionAction.bind(null, exam.id)}
              submitLabel="Add question"
            />
          </div>
        </article>
      </section>
    </div>
  );
}
