"use client";

import { useActionState, useMemo, useState } from "react";
import {
  allowedQuestionTypes,
  examTypeLabel,
  type ExamType,
} from "@/lib/admin/exam-kind";
import type { QuestionType } from "@/lib/supabase/database.types";
import type { Json, Tables } from "@/lib/supabase/database.types";

type ActionState = { error?: string; success?: string } | null;
type QuestionAction = (
  state: ActionState,
  formData: FormData,
) => Promise<ActionState>;

type Option = { id: string; text: string };

const TYPES: { value: QuestionType; label: string }[] = [
  { value: "single_choice", label: "Single-choice MCQ" },
  { value: "multiple_choice", label: "Multiple-choice" },
  { value: "true_false", label: "True / False" },
  { value: "short_answer", label: "Short answer" },
  { value: "long_answer", label: "Long answer / essay" },
];

function asOptions(value: Json | null): Option[] {
  if (!Array.isArray(value)) {
    return [
      { id: "a", text: "" },
      { id: "b", text: "" },
    ];
  }

  return value.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      return [];
    }
    const id = "id" in item ? String(item.id) : "";
    const text = "text" in item ? String(item.text) : "";
    return id ? [{ id, text }] : [];
  });
}

function asCorrectIds(value: Json | null): string[] {
  if (typeof value === "string") {
    return [value];
  }
  if (Array.isArray(value)) {
    return value.map((item) => String(item));
  }
  return [];
}

function asAcceptable(value: Json | null) {
  if (!Array.isArray(value)) {
    return "";
  }
  return value.map((item) => String(item)).join("\n");
}

export function QuestionForm({
  question,
  action,
  submitLabel,
  examType,
}: {
  question?: Tables<"questions">;
  action: QuestionAction;
  submitLabel: string;
  examType: ExamType;
}) {
  const allowedTypes = TYPES.filter((item) =>
    allowedQuestionTypes(examType).includes(item.value),
  );
  const [state, submit, pending] = useActionState(action, null);
  const [type, setType] = useState<QuestionType>(
    (question?.type as QuestionType | undefined) ??
      allowedTypes[0]?.value ??
      "single_choice",
  );
  const [options, setOptions] = useState<Option[]>(() => {
    if (question?.type === "true_false") {
      return [
        { id: "true", text: "True" },
        { id: "false", text: "False" },
      ];
    }
    return asOptions(question?.options ?? null);
  });
  const [correctIds, setCorrectIds] = useState<string[]>(
    asCorrectIds(question?.correct_answer ?? null),
  );

  const usesOptions = type !== "short_answer" && type !== "long_answer";
  const multiple = type === "multiple_choice";
  const visibleOptions = useMemo(
    () =>
      type === "true_false"
        ? [
            { id: "true", text: "True" },
            { id: "false", text: "False" },
          ]
        : options,
    [options, type],
  );

  function toggleCorrect(id: string) {
    setCorrectIds((current) => {
      if (multiple) {
        return current.includes(id)
          ? current.filter((value) => value !== id)
          : [...current, id];
      }
      return [id];
    });
  }

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

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Type</span>
          <select
            name="type"
            value={type}
            onChange={(event) => {
              const next = event.target.value as QuestionType;
              setType(next);
              if (next === "true_false") {
                setOptions([
                  { id: "true", text: "True" },
                  { id: "false", text: "False" },
                ]);
                setCorrectIds(["true"]);
              }
            }}
            className="w-full rounded-xl border border-border bg-white px-3 py-2"
          >
            {allowedTypes.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
          <span className="block text-muted">
            {examType === "mcq"
              ? "This MCQ exam only accepts objective questions."
              : `${examTypeLabel(examType)} exams can include written questions.`}
          </span>
        </label>
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Marks</span>
          <input
            type="number"
            name="marks"
            min={0.5}
            step="0.5"
            required
            defaultValue={question?.marks ?? 1}
            className="w-full rounded-xl border border-border bg-white px-3 py-2"
          />
        </label>
      </div>

      <label className="block space-y-1 text-sm">
        <span className="font-medium">Question</span>
        <textarea
          name="question_text"
          rows={3}
          required
          defaultValue={question?.question_text ?? ""}
          className="w-full rounded-xl border border-border bg-white px-3 py-2"
        />
      </label>

      {usesOptions ? (
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Options and answer key</legend>
          {visibleOptions.map((option, index) => (
            <div key={option.id} className="flex items-center gap-2">
              <input
                type={multiple ? "checkbox" : "radio"}
                name="correct_option_id"
                value={option.id}
                checked={correctIds.includes(option.id)}
                onChange={() => toggleCorrect(option.id)}
              />
              {type === "true_false" ? (
                <>
                  <input type="hidden" name="option_text" value={option.text} />
                  <span className="text-sm">{option.text}</span>
                </>
              ) : (
                <input
                  name="option_text"
                  value={option.text}
                  onChange={(event) => {
                    const text = event.target.value;
                    setOptions((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, text } : item,
                      ),
                    );
                  }}
                  placeholder={`Option ${option.id}`}
                  className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm"
                />
              )}
            </div>
          ))}
          {type !== "true_false" ? (
            <button
              type="button"
              onClick={() =>
                setOptions((current) => [
                  ...current,
                  { id: String.fromCharCode(97 + current.length), text: "" },
                ])
              }
              className="text-sm font-medium text-accent"
            >
              Add option
            </button>
          ) : null}
        </fieldset>
      ) : null}

      {type === "short_answer" ? (
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Acceptable answers (one per line)</span>
          <textarea
            name="acceptable_answers"
            rows={3}
            defaultValue={asAcceptable(question?.acceptable_answers ?? null)}
            placeholder="paris"
            className="w-full rounded-xl border border-border bg-white px-3 py-2"
          />
        </label>
      ) : null}

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
