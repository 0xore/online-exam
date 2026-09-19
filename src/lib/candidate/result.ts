import type { AttemptStatus, ExamType, Json } from "@/lib/supabase/database.types";

export type CandidateResultOption = { id: string; text: string };

export type CandidateResultQuestion = {
  id: string;
  question_text: string;
  selected: CandidateResultOption[];
  correct: CandidateResultOption[];
  is_correct: boolean;
};

export type CandidateMcqResult = {
  auto_score: number;
  max_score: number;
  pass_mark: number | null;
  passed: boolean | null;
  questions: CandidateResultQuestion[];
};

export type CandidateResult = {
  ok: true;
  exam_type: ExamType;
  status: AttemptStatus;
  result: CandidateMcqResult | null;
};

function asRecord(data: Json | null): Record<string, unknown> | null {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return null;
  }

  return data as Record<string, unknown>;
}

function asOptions(value: unknown): CandidateResultOption[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    const row = asRecord(item as Json);
    if (!row || typeof row.id !== "string") {
      return [];
    }

    return [{ id: row.id, text: String(row.text ?? row.id) }];
  });
}

export function parseCandidateResult(data: Json | null): CandidateResult | null {
  const row = asRecord(data);
  if (!row || row.ok !== true) {
    return null;
  }

  const raw = asRecord((row.result as Json) ?? null);
  let result: CandidateMcqResult | null = null;
  if (raw) {
    const questions = Array.isArray(raw.questions)
      ? raw.questions.flatMap((item) => {
          const question = asRecord(item as Json);
          if (!question || typeof question.id !== "string") {
            return [];
          }

          return [
            {
              id: question.id,
              question_text: String(question.question_text ?? ""),
              selected: asOptions(question.selected),
              correct: asOptions(question.correct),
              is_correct: question.is_correct === true,
            },
          ];
        })
      : [];

    result = {
      auto_score: Number(raw.auto_score ?? 0),
      max_score: Number(raw.max_score ?? 0),
      pass_mark: raw.pass_mark == null ? null : Number(raw.pass_mark),
      passed: typeof raw.passed === "boolean" ? raw.passed : null,
      questions,
    };
  }

  return {
    ok: true,
    exam_type: row.exam_type === "mcq" ? "mcq" : "mixed",
    status: row.status === "expired" ? "expired" : "submitted",
    result,
  };
}
