import { createExamAction } from "@/app/admin/actions";
import { ExamForm } from "@/app/admin/(protected)/exams/exam-form";
import { examTypeLabel, isExamType, type ExamType } from "@/lib/admin/exam-kind";
import { requireAdmin } from "@/lib/admin/require-admin";

type NewExamPageProps = PageProps<"/admin/exams/new">;

export default async function NewExamPage({ searchParams }: NewExamPageProps) {
  await requireAdmin();
  const params = await searchParams;
  const requestedType = Array.isArray(params.type) ? params.type[0] : params.type;
  const defaultExamType: ExamType =
    requestedType && isExamType(requestedType) ? requestedType : "mixed";

  return (
    <section className="rounded-[28px] bg-card p-8 shadow-[0_18px_50px_rgba(16,16,17,0.06)]">
      <p className="text-sm font-medium uppercase tracking-wider text-muted">
        New {examTypeLabel(defaultExamType)} exam
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Exam details</h1>
      <div className="mt-6">
        <ExamForm
          action={createExamAction}
          defaultExamType={defaultExamType}
          submitLabel="Create exam"
        />
      </div>
    </section>
  );
}
