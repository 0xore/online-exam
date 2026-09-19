import type { QuestionType } from "@/lib/supabase/database.types";

export const EXAM_TYPES = ["mcq", "mixed"] as const;
export type ExamType = (typeof EXAM_TYPES)[number];

export const MCQ_QUESTION_TYPES = [
  "single_choice",
  "multiple_choice",
  "true_false",
] as const satisfies readonly QuestionType[];

export const WRITTEN_QUESTION_TYPES = [
  "short_answer",
  "long_answer",
] as const satisfies readonly QuestionType[];

export function isExamType(value: string): value is ExamType {
  return EXAM_TYPES.includes(value as ExamType);
}

export function isMcqQuestionType(value: string) {
  return (MCQ_QUESTION_TYPES as readonly string[]).includes(value);
}

export function examTypeLabel(value: string) {
  return value === "mcq" ? "MCQ" : "Mixed";
}

export function allowedQuestionTypes(examType: ExamType): QuestionType[] {
  if (examType === "mcq") {
    return [...MCQ_QUESTION_TYPES];
  }

  return [...MCQ_QUESTION_TYPES, ...WRITTEN_QUESTION_TYPES];
}
