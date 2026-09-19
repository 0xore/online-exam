import Link from "next/link";
import { CopyExamUrl } from "@/app/admin/(protected)/exams/copy-exam-url";
import { Eyebrow, Panel, StatTile } from "@/components/shell";
import { examTypeLabel, type ExamType } from "@/lib/admin/exam-kind";
import { requireAdmin } from "@/lib/admin/require-admin";

type ExamListItem = {
  id: string;
  title: string;
  slug: string;
  duration_minutes: number;
  published: boolean;
  exam_type: string;
  questions: { count: number }[] | null;
};

function ExamGroup({
  title,
  description,
  examType,
  exams,
}: {
  title: string;
  description: string;
  examType: ExamType;
  exams: ExamListItem[];
}) {
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
          <p className="mt-1 text-sm text-muted">{description}</p>
        </div>
        <Link
          href={`/admin/exams/new?type=${examType}`}
          className="rounded-full bg-sky px-4 py-2 text-sm font-semibold text-ink"
        >
          New {examTypeLabel(examType)} exam
        </Link>
      </div>

      {exams.length === 0 ? (
        <p className="rounded-[28px] bg-card px-5 py-6 text-sm text-muted shadow-[0_18px_50px_rgba(16,16,17,0.06)]">
          No {examType === "mcq" ? "MCQ" : "mixed"} exams yet.
        </p>
      ) : (
        exams.map((exam) => {
          const questionCount = Array.isArray(exam.questions)
            ? (exam.questions[0]?.count ?? 0)
            : 0;

          return (
            <article
              key={exam.id}
              className="rounded-[28px] bg-card p-5 shadow-[0_18px_50px_rgba(16,16,17,0.06)]"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold">{exam.title}</h3>
                  <p className="mt-1 text-sm text-muted">
                    {examTypeLabel(exam.exam_type)} · {exam.duration_minutes} minutes ·{" "}
                    {questionCount} questions · {exam.published ? "Published" : "Draft"}
                  </p>
                </div>
                <div className="flex gap-3">
                  <Link
                    href={`/admin/exams/${exam.id}/attempts`}
                    className="text-sm font-semibold underline decoration-sky decoration-2 underline-offset-4"
                  >
                    Mark
                  </Link>
                  <Link
                    href={`/admin/exams/${exam.id}`}
                    className="text-sm font-semibold underline decoration-sky decoration-2 underline-offset-4"
                  >
                    Edit
                  </Link>
                </div>
              </div>
              <div className="mt-4">
                <CopyExamUrl slug={exam.slug} />
              </div>
            </article>
          );
        })
      )}
    </section>
  );
}

export default async function AdminDashboardPage() {
  const { supabase } = await requireAdmin();
  const { data: exams, error } = await supabase
    .from("exams")
    .select("id, title, slug, duration_minutes, published, exam_type, questions(count)")
    .order("created_at", { ascending: false });

  const items = (exams ?? []) as ExamListItem[];
  const mcqExams = items.filter((exam) => exam.exam_type === "mcq");
  const mixedExams = items.filter((exam) => exam.exam_type !== "mcq");

  return (
    <section className="space-y-8">
      <Panel>
        <Eyebrow>Good morning</Eyebrow>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Exams</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
          MCQ exams are objective only and can show a result after submit. Mixed
          exams can include short and long answers and stay confirmation-only
          for candidates.
        </p>
      </Panel>
      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile label="MCQ papers" value={mcqExams.length} tone="sky" />
        <StatTile label="Mixed papers" value={mixedExams.length} tone="blush" />
        <StatTile
          label="Published"
          value={items.filter((exam) => exam.published).length}
          tone="gold"
        />
      </div>

      {error ? (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {error.message}
        </p>
      ) : null}

      <ExamGroup
        title="MCQ exams"
        description="Single-choice, multiple-choice, and true/false only."
        examType="mcq"
        exams={mcqExams}
      />
      <ExamGroup
        title="Mixed exams"
        description="MCQ questions plus short answers and essays."
        examType="mixed"
        exams={mixedExams}
      />
    </section>
  );
}
