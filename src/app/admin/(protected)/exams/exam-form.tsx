"use client";

import { useActionState } from "react";
import { toDateTimeLocal } from "@/lib/admin/datetime";
import type { ExamType } from "@/lib/admin/exam-kind";
import { parseExamSettings } from "@/lib/admin/settings";
import type { Tables } from "@/lib/supabase/database.types";

type Exam = Tables<"exams">;
type ActionState = { error?: string; success?: string } | null;
type ExamAction = (state: ActionState, formData: FormData) => Promise<ActionState>;

type ExamFormProps = {
  exam?: Exam;
  action: ExamAction;
  submitLabel: string;
  defaultExamType?: ExamType;
};

export function ExamForm({
  exam,
  action,
  submitLabel,
  defaultExamType = "mixed",
}: ExamFormProps) {
  const [state, submit, pending] = useActionState(action, null);
  const settings = parseExamSettings(exam?.settings ?? {});

  return (
    <form action={submit} className="space-y-4">
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
        <span className="font-medium">Title</span>
        <input
          name="title"
          required
          defaultValue={exam?.title ?? ""}
          className="w-full rounded-xl border border-border bg-white px-3 py-2"
        />
      </label>
      <label className="block space-y-1 text-sm">
        <span className="font-medium">Public slug</span>
        <input
          name="slug"
          required
          defaultValue={exam?.slug ?? ""}
          placeholder="practice-5min"
          className="w-full rounded-xl border border-border bg-white px-3 py-2 font-mono"
        />
      </label>
      <label className="block space-y-1 text-sm">
        <span className="font-medium">Exam type</span>
        <select
          name="exam_type"
          defaultValue={exam?.exam_type ?? defaultExamType}
          className="w-full rounded-xl border border-border bg-white px-3 py-2"
        >
          <option value="mcq">MCQ — single-choice, multiple-choice, and true/false</option>
          <option value="mixed">Mixed — MCQ plus short and long answers</option>
        </select>
        <span className="block text-muted">
          MCQ exams can show the candidate a result after submit. Mixed exams stay
          confirmation-only.
        </span>
      </label>
      <label className="block space-y-1 text-sm">
        <span className="font-medium">Instructions</span>
        <textarea
          name="description"
          rows={5}
          defaultValue={exam?.description ?? ""}
          className="w-full rounded-xl border border-border bg-white px-3 py-2"
        />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Duration (minutes)</span>
          <input
            type="number"
            name="duration_minutes"
            min={1}
            max={240}
            required
            defaultValue={exam?.duration_minutes ?? 45}
            className="w-full rounded-xl border border-border bg-white px-3 py-2"
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Pass mark (optional)</span>
          <input
            type="number"
            name="pass_mark"
            min={0}
            step="0.5"
            defaultValue={exam?.pass_mark ?? ""}
            className="w-full rounded-xl border border-border bg-white px-3 py-2"
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Available from</span>
          <input
            type="datetime-local"
            name="available_from"
            defaultValue={toDateTimeLocal(exam?.available_from)}
            className="w-full rounded-xl border border-border bg-white px-3 py-2"
          />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Available until</span>
          <input
            type="datetime-local"
            name="available_until"
            defaultValue={toDateTimeLocal(exam?.available_until)}
            className="w-full rounded-xl border border-border bg-white px-3 py-2"
          />
        </label>
      </div>
      <div className="space-y-2 text-sm">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            name="published"
            defaultChecked={exam?.published ?? false}
          />
          Published
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            name="randomise_questions"
            defaultChecked={settings.randomise_questions}
          />
          Randomise question order
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            name="randomise_options"
            defaultChecked={settings.randomise_options}
          />
          Randomise MCQ options
        </label>
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-sky px-4 py-2.5 text-sm font-semibold text-ink disabled:opacity-60"
      >
        {pending ? "Saving..." : submitLabel}
      </button>
    </form>
  );
}
