"use client";

import { useCallback, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  saveCandidateAnswerAction,
  submitCandidateAttemptAction,
  syncCandidateAttemptAction,
} from "@/app/e/[slug]/sit/actions";
import { RemainingTime } from "@/app/e/[slug]/sit/remaining-time";
import { useServerClock } from "@/app/e/[slug]/sit/use-server-clock";
import { isAnswered, questionTypeLabel } from "@/lib/candidate/paper";
import type {
  CandidateAnswerValue,
  CandidatePaper,
  CandidatePaperQuestion,
} from "@/lib/candidate/paper";

type ExamPaperProps = {
  slug: string;
  paper: CandidatePaper;
};

function emptyAnswer(question: CandidatePaperQuestion): CandidateAnswerValue {
  if (question.type === "short_answer" || question.type === "long_answer") {
    return { text: "" };
  }

  return { selected: [] };
}

export function ExamPaper({ slug, paper }: ExamPaperProps) {
  const router = useRouter();
  const [ended, setEnded] = useState(paper.status !== "active");
  const locked = paper.status !== "active" || ended;
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, CandidateAnswerValue>>(
    () => paper.answers,
  );
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [pending, startTransition] = useTransition();
  const saveTimers = useRef<Record<string, number>>({});

  const question = paper.questions[index];
  const answeredCount = useMemo(
    () => paper.questions.filter((item) => isAnswered(answers[item.id])).length,
    [answers, paper.questions],
  );

  const persist = useCallback(
    async (questionId: string, next: CandidateAnswerValue) => {
      setSaveState("saving");
      const result = await saveCandidateAnswerAction(slug, questionId, next);
      if (result.locked) {
        setEnded(true);
        return;
      }

      if (!result.ok) {
        setSaveState("error");
        setError(result.error ?? "Could not save that answer.");
        return;
      }

      setSaveState("saved");
      setError(null);
    },
    [slug],
  );

  const updateAnswer = useCallback(
    (questionId: string, next: CandidateAnswerValue, immediate: boolean) => {
      setAnswers((current) => ({ ...current, [questionId]: next }));
      window.clearTimeout(saveTimers.current[questionId]);

      if (immediate) {
        void persist(questionId, next);
        return;
      }

      saveTimers.current[questionId] = window.setTimeout(() => {
        void persist(questionId, next);
      }, 800);
    },
    [persist],
  );

  async function flushSaves() {
    const pendingIds = Object.keys(saveTimers.current);
    pendingIds.forEach((questionId) => {
      window.clearTimeout(saveTimers.current[questionId]);
    });

    await Promise.all(
      paper.questions.map((item) => {
        const answer = answers[item.id];
        return answer ? persist(item.id, answer) : Promise.resolve();
      }),
    );
  }

  const handleExpire = useCallback(() => {
    setEnded(true);
    void syncCandidateAttemptAction(slug);
  }, [slug]);

  const clock = useServerClock(
    slug,
    { expiresAt: paper.expires_at, serverNow: paper.server_now },
    locked,
    handleExpire,
  );

  function handleSubmit() {
    if (!confirmSubmit) {
      setConfirmSubmit(true);
      return;
    }

    startTransition(async () => {
      await flushSaves();
      const result = await submitCandidateAttemptAction(slug);
      if (!result.ok && !result.locked) {
        setError(result.error ?? "Could not submit this exam.");
        setConfirmSubmit(false);
        return;
      }

      router.refresh();
    });
  }

  if (!question) {
    return (
      <p className="mt-6 text-sm text-muted">This exam has no questions yet.</p>
    );
  }

  const current = answers[question.id] ?? emptyAnswer(question);

  const saveLabel =
    saveState === "saving"
      ? "Saving"
      : saveState === "saved"
        ? "Saved"
        : saveState === "error"
          ? "Save failed"
          : "Ready";

  return (
    <div className="mt-6 space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-[22px] bg-gold/50 px-4 py-4">
          <p className="text-sm text-muted">Time remaining</p>
          <RemainingTime
            expiresAt={clock.expiresAt}
            serverNow={clock.serverNow}
            onExpire={locked ? undefined : handleExpire}
          />
        </div>
        <div className="rounded-[22px] bg-sky/25 px-4 py-4">
          <p className="text-sm text-muted">Progress</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight">
            {answeredCount} / {paper.questions.length}
          </p>
        </div>
        <div className="rounded-[22px] bg-blush/50 px-4 py-4">
          <p className="text-sm text-muted">Autosave</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight">{saveLabel}</p>
        </div>
      </div>

      {ended && paper.status === "active" ? (
        <p className="rounded-[22px] bg-gold/40 px-4 py-3 text-sm">
          Time is up. Answers are locked.
        </p>
      ) : null}
      {error ? (
        <p className="rounded-[22px] bg-blush/60 px-4 py-3 text-sm">
          {error}
        </p>
      ) : null}

      <nav className="flex flex-wrap gap-2" aria-label="Questions">
        {paper.questions.map((item, itemIndex) => {
          const done = isAnswered(answers[item.id]);
          const currentItem = itemIndex === index;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setIndex(itemIndex)}
              className={`h-10 w-10 rounded-full text-sm font-semibold ${
                currentItem
                  ? "bg-ink text-white"
                  : done
                    ? "bg-sky/30 text-ink"
                    : "bg-background text-muted"
              }`}
              aria-current={currentItem ? "true" : undefined}
            >
              {itemIndex + 1}
            </button>
          );
        })}
      </nav>

      <article className="rounded-[24px] bg-background px-5 py-5">
        <p className="text-sm font-medium text-muted">
          Question {index + 1} of {paper.questions.length} ·{" "}
          {questionTypeLabel(question.type)}
        </p>
        <h2 className="mt-2 whitespace-pre-wrap text-lg font-semibold leading-7">
          {question.question_text}
        </h2>

        <div className="mt-5">
          <QuestionInput
            question={question}
            answer={current}
            disabled={locked || pending}
            onChange={(next, immediate) =>
              updateAnswer(question.id, next, immediate)
            }
          />
        </div>
      </article>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          disabled={index === 0}
          onClick={() => setIndex((value) => Math.max(0, value - 1))}
          className="rounded-full bg-background px-4 py-2.5 text-sm font-semibold disabled:opacity-40"
        >
          Previous
        </button>
        {index < paper.questions.length - 1 ? (
          <button
            type="button"
            onClick={() =>
              setIndex((value) => Math.min(paper.questions.length - 1, value + 1))
            }
            className="rounded-full bg-sky px-4 py-2.5 text-sm font-semibold text-ink"
          >
            Next
          </button>
        ) : locked ? null : (
          <div className="flex flex-wrap items-center gap-3">
            {confirmSubmit ? (
              <button
                type="button"
                disabled={pending}
                onClick={() => setConfirmSubmit(false)}
                className="rounded-full bg-background px-4 py-2.5 text-sm font-semibold disabled:opacity-60"
              >
                Keep editing
              </button>
            ) : null}
            <button
              type="button"
              disabled={pending}
              onClick={handleSubmit}
              className="rounded-full bg-ink px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {pending
                ? "Submitting..."
                : confirmSubmit
                  ? "Confirm submit"
                  : "Submit exam"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function QuestionInput({
  question,
  answer,
  disabled,
  onChange,
}: {
  question: CandidatePaperQuestion;
  answer: CandidateAnswerValue;
  disabled: boolean;
  onChange: (next: CandidateAnswerValue, immediate: boolean) => void;
}) {
  if (
    question.type === "single_choice" ||
    question.type === "true_false" ||
    question.type === "multiple_choice"
  ) {
    const multiple = question.type === "multiple_choice";
    const selected = answer.selected ?? [];

    return (
      <fieldset className="space-y-2" disabled={disabled}>
        <legend className="sr-only">{questionTypeLabel(question.type)}</legend>
        {(question.options ?? []).map((option) => {
          const checked = selected.includes(option.id);
          return (
            <label
              key={option.id}
              className={`flex cursor-pointer items-start gap-3 rounded-2xl px-4 py-3.5 text-sm ${
                checked ? "bg-sky/25 font-medium" : "bg-card"
              }`}
            >
              <input
                type={multiple ? "checkbox" : "radio"}
                name={question.id}
                checked={checked}
                disabled={disabled}
                onChange={() => {
                  if (multiple) {
                    const next = checked
                      ? selected.filter((id) => id !== option.id)
                      : [...selected, option.id];
                    onChange({ selected: next }, true);
                    return;
                  }

                  onChange({ selected: [option.id] }, true);
                }}
                className="mt-0.5"
              />
              <span>{option.text}</span>
            </label>
          );
        })}
      </fieldset>
    );
  }

  const isLong = question.type === "long_answer";
  return (
    <label className="block space-y-2 text-sm">
      <span className="sr-only">{questionTypeLabel(question.type)}</span>
      {isLong ? (
        <textarea
          rows={8}
          maxLength={8000}
          disabled={disabled}
          value={answer.text ?? ""}
          onChange={(event) => onChange({ text: event.target.value }, false)}
          onBlur={(event) => onChange({ text: event.target.value }, true)}
          className="w-full rounded-2xl border border-border bg-card px-3 py-2"
        />
      ) : (
        <input
          type="text"
          maxLength={400}
          disabled={disabled}
          value={answer.text ?? ""}
          onChange={(event) => onChange({ text: event.target.value }, false)}
          onBlur={(event) => onChange({ text: event.target.value }, true)}
          className="w-full rounded-2xl border border-border bg-card px-3 py-2"
        />
      )}
    </label>
  );
}
