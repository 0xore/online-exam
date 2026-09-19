import type { Json } from "@/lib/supabase/database.types";
import { questionSchema } from "@/lib/admin/schemas";

export function optionId(index: number) {
  return String.fromCharCode(97 + index);
}

export function toQuestionColumns(parsed: ReturnType<typeof questionSchema.parse>) {
  if (parsed.type === "long_answer") {
    return {
      type: parsed.type,
      question_text: parsed.question_text,
      marks: parsed.marks,
      options: null,
      correct_answer: null,
      acceptable_answers: null,
    };
  }

  if (parsed.type === "short_answer") {
    if (!parsed.acceptable_answers?.length) {
      throw new Error("Add at least one acceptable short-answer variant.");
    }

    return {
      type: parsed.type,
      question_text: parsed.question_text,
      marks: parsed.marks,
      options: null,
      correct_answer: null,
      acceptable_answers: parsed.acceptable_answers as unknown as Json,
    };
  }

  const options = parsed.options ?? [];
  if (options.length < 2) {
    throw new Error("Add at least two answer options.");
  }

  const correct = parsed.correct_option_ids ?? [];
  if (parsed.type === "multiple_choice") {
    if (correct.length < 1) {
      throw new Error("Select at least one correct option.");
    }

    return {
      type: parsed.type,
      question_text: parsed.question_text,
      marks: parsed.marks,
      options: options as unknown as Json,
      correct_answer: correct as unknown as Json,
      acceptable_answers: null,
    };
  }

  if (correct.length !== 1) {
    throw new Error("Select one correct option.");
  }

  return {
    type: parsed.type,
    question_text: parsed.question_text,
    marks: parsed.marks,
    options: options as unknown as Json,
    correct_answer: correct[0] as unknown as Json,
    acceptable_answers: null,
  };
}
