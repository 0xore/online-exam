"use client";

import { useActionState } from "react";
import { importQuestionsAction } from "@/app/admin/question-actions";

type ActionState = { error?: string; success?: string } | null;

export function QuestionImport({ examId }: { examId: string }) {
  const [state, submit, pending] = useActionState(
    importQuestionsAction.bind(null, examId),
    null as ActionState,
  );

  return (
    <article className="rounded-[28px] bg-card p-6 shadow-[0_18px_50px_rgba(16,16,17,0.06)]">
      <h3 className="text-lg font-semibold">Upload questions</h3>
      <p className="mt-2 text-sm leading-6 text-muted">
        Download the Excel or Word template, fill one question per row, then
        upload the completed file. Existing questions stay; imported rows are
        added at the end.
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <a
          href={`/admin/exams/${examId}/questions/template?format=xlsx`}
          className="rounded-full bg-sky px-4 py-2 text-sm font-semibold text-ink"
        >
          Excel template
        </a>
        <a
          href={`/admin/exams/${examId}/questions/template?format=docx`}
          className="rounded-full bg-background px-4 py-2 text-sm font-semibold text-ink"
        >
          Word template
        </a>
      </div>
      <form action={submit} className="mt-5 space-y-3">
        {state?.error ? (
          <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {state.error}
          </p>
        ) : null}
        {state?.success ? (
          <p className="rounded-xl bg-green-50 px-4 py-3 text-sm text-green-800">
            {state.success}
          </p>
        ) : null}
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Filled template</span>
          <input
            type="file"
            name="file"
            required
            accept=".xlsx,.docx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="block w-full text-sm file:mr-3 file:rounded-full file:border-0 file:bg-sky file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-ink"
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-ink px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {pending ? "Importing..." : "Import questions"}
        </button>
      </form>
    </article>
  );
}
