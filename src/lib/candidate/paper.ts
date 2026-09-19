import type {
  AttemptStatus,
  ExamType,
  Json,
  QuestionType,
} from "@/lib/supabase/database.types";

export type CandidateAnswerValue = {
  selected?: string[];
  text?: string;
};

export type CandidatePaperQuestion = {
  id: string;
  type: QuestionType;
  question_text: string;
  options: { id: string; text: string }[] | null;
};

export type CandidatePaper = {
  ok: true;
  attempt_id: string;
  student_name: string;
  started_at: string;
  expires_at: string;
  status: AttemptStatus;
  exam_title: string;
  exam_type: ExamType;
  duration_minutes: number;
  server_now: string;
  questions: CandidatePaperQuestion[];
  answers: Record<string, CandidateAnswerValue>;
};

function asRecord(data: Json | null): Record<string, unknown> | null {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return null;
  }

  return data as Record<string, unknown>;
}

function asStatus(value: unknown): AttemptStatus {
  if (
    value === "active" ||
    value === "submitted" ||
    value === "expired" ||
    value === "reset"
  ) {
    return value;
  }

  return "active";
}

function asQuestionType(value: unknown): QuestionType | null {
  if (
    value === "single_choice" ||
    value === "multiple_choice" ||
    value === "true_false" ||
    value === "short_answer" ||
    value === "long_answer"
  ) {
    return value;
  }

  return null;
}

function asOptions(value: unknown): { id: string; text: string }[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const options = value.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      return [];
    }

    const row = item as Record<string, unknown>;
    const id = typeof row.id === "string" ? row.id : "";
    const text = typeof row.text === "string" ? row.text : "";
    return id ? [{ id, text }] : [];
  });

  return options.length > 0 ? options : null;
}

export function parseCandidateAnswer(value: unknown): CandidateAnswerValue {
  const row = asRecord(value as Json);
  if (!row) {
    return {};
  }

  const selected = Array.isArray(row.selected)
    ? row.selected.map((item) => String(item)).filter(Boolean)
    : undefined;
  const text = typeof row.text === "string" ? row.text : undefined;
  return { selected, text };
}

export function parseCandidatePaper(data: Json | null): CandidatePaper | null {
  const row = asRecord(data);
  if (!row || row.ok !== true) {
    return null;
  }

  if (
    typeof row.attempt_id !== "string" ||
    typeof row.started_at !== "string" ||
    typeof row.expires_at !== "string"
  ) {
    return null;
  }

  const questions = Array.isArray(row.questions)
    ? row.questions.flatMap((item) => {
        const question = asRecord(item as Json);
        if (!question) {
          return [];
        }

        const type = asQuestionType(question.type);
        if (!type || typeof question.id !== "string") {
          return [];
        }

        return [
          {
            id: question.id,
            type,
            question_text: String(question.question_text ?? ""),
            options: asOptions(question.options),
          },
        ];
      })
    : [];

  const answers: Record<string, CandidateAnswerValue> = {};
  const rawAnswers = asRecord((row.answers as Json) ?? null) ?? {};
  for (const [questionId, answer] of Object.entries(rawAnswers)) {
    answers[questionId] = parseCandidateAnswer(answer);
  }

  return {
    ok: true,
    attempt_id: row.attempt_id,
    student_name: String(row.student_name ?? ""),
    started_at: row.started_at,
    expires_at: row.expires_at,
    status: asStatus(row.status),
    exam_title: String(row.exam_title ?? "Exam"),
    exam_type: row.exam_type === "mcq" ? "mcq" : "mixed",
    duration_minutes: Number(row.duration_minutes ?? 0),
    server_now: typeof row.server_now === "string" ? row.server_now : new Date().toISOString(),
    questions,
    answers,
  };
}

export function isAnswered(answer: CandidateAnswerValue | undefined) {
  if (!answer) {
    return false;
  }

  if (answer.selected && answer.selected.length > 0) {
    return true;
  }

  return Boolean(answer.text?.trim());
}

export function questionTypeLabel(type: QuestionType) {
  switch (type) {
    case "single_choice":
      return "Single choice";
    case "multiple_choice":
      return "Select all that apply";
    case "true_false":
      return "True or false";
    case "short_answer":
      return "Short answer";
    case "long_answer":
      return "Written answer";
  }
}
