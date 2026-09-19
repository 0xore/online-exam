"use client";

import { useActionState } from "react";
import { deleteExamAction } from "@/app/admin/actions";

type DeleteExamButtonProps = {
  examId: string;
  examTitle: string;
};

export function DeleteExamButton({ examId, examTitle }: DeleteExamButtonProps) {
  const [state, submit, pending] = useActionState(deleteExamAction, null);

  return (
    <form
      action={submit}
      className="mt-6 space-y-3"
      onSubmit={(event) => {
        if (
          !window.confirm(
            `Delete “${examTitle}”? Questions, attempts, and marks will be removed.`,
          )
        ) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="examId" value={examId} />
      {state?.error ? (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {state.error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="text-sm font-medium text-red-700 hover:underline disabled:opacity-60"
      >
        {pending ? "Deleting..." : "Delete exam"}
      </button>
    </form>
  );
}
