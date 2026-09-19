import type { Json } from "@/lib/supabase/database.types";

export type ExamSettings = {
  randomise_questions: boolean;
  randomise_options: boolean;
};

export function parseExamSettings(value: Json): ExamSettings {
  const record =
    value && typeof value === "object" && !Array.isArray(value)
      ? value
      : {};

  return {
    randomise_questions: Boolean(
      "randomise_questions" in record && record.randomise_questions,
    ),
    randomise_options: Boolean(
      "randomise_options" in record && record.randomise_options,
    ),
  };
}
