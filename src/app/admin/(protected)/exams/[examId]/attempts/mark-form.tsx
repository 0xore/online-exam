"use client";

import { useActionState } from "react";
import { saveManualMarkAction } from "@/app/admin/marking-actions";

type MarkFormProps = {
  examId: string;
  attemptId: string;
  answerId: string;
  maxMarks: number;
  manualMarks: number | string | null;
  comment: string | null;
};

export function MarkForm({
  examId,
  attemptId,
  answerId,
  maxMarks,
  manualMarks,
  comment,
}: MarkFormProps) {
  const action = saveManualMarkAction.bind(null, examId, attemptId, answerId);
  const [state, submit, pending] = useActionState(action, null);

  return (
    <form action={submit} className="mt-4 space-y-3">
      {state?.error ? (
        <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {state.error}
        </p>
      ) : null}
      {state?.success ? (
        <p className="rounded-xl bg-green-50 px-3 py-2 text-sm text-green-800">
          {state.success}
        </p>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Manual mark</span>
          <input
            name="manual_marks"
            type="number"
            min={0}
            max={maxMarks}
            step="0.5"
            defaultValue={manualMarks ?? ""}
            placeholder={`Blank uses auto / ${maxMarks}`}
            className="w-full rounded-xl border border-border bg-white px-3 py-2"
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Comment</span>
          <input
            name="marker_comment"
            defaultValue={comment ?? ""}
            maxLength={500}
            className="w-full rounded-xl border border-border bg-white px-3 py-2"
          />
        </label>
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-sky px-4 py-2 text-sm font-semibold text-ink disabled:opacity-60"
      >
        {pending ? "Saving..." : "Save mark"}
      </button>
    </form>
  );
}
