"use server";

import { revalidatePath } from "next/cache";
import { isMcqQuestionType } from "@/lib/admin/exam-kind";
import { requireAdmin } from "@/lib/admin/require-admin";
import { questionSchema, questionTypeSchema } from "@/lib/admin/schemas";
import type { Json } from "@/lib/supabase/database.types";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type ActionState = { error?: string; success?: string } | null;

function optionId(index: number) {
  return String.fromCharCode(97 + index);
}

function readQuestionInput(formData: FormData) {
  const type = questionTypeSchema.parse(String(formData.get("type") ?? ""));
  const texts = formData.getAll("option_text").map((value) => String(value));
  const options = texts
    .map((text, index) => ({ id: optionId(index), text: text.trim() }))
    .filter((option) => option.text.length > 0);

  const correctOptionIds = formData
    .getAll("correct_option_id")
    .map((value) => String(value));

  const acceptableAnswers = String(formData.get("acceptable_answers") ?? "")
    .split(/\r?\n/)
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  return questionSchema.safeParse({
    type,
    question_text: formData.get("question_text"),
    marks: formData.get("marks"),
    options:
      type === "short_answer" || type === "long_answer" ? undefined : options,
    correct_option_ids: correctOptionIds,
    acceptable_answers: acceptableAnswers,
  });
}

function toQuestionColumns(parsed: ReturnType<typeof questionSchema.parse>) {
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

async function assertQuestionMatchesExam(
  examId: string,
  questionType: string,
) {
  const supabase = await createServerSupabaseClient();
  const { data: exam } = await supabase
    .from("exams")
    .select("exam_type")
    .eq("id", examId)
    .single();

  if (exam?.exam_type === "mcq" && !isMcqQuestionType(questionType)) {
    throw new Error(
      "MCQ exams can only include single-choice, multiple-choice, or true/false questions.",
    );
  }
}

async function revalidateExam(examId: string) {
  const { supabase } = await requireAdmin();
  const { data } = await supabase.from("exams").select("slug").eq("id", examId).single();
  revalidatePath("/admin");
  revalidatePath(`/admin/exams/${examId}`);
  if (data?.slug) {
    revalidatePath(`/e/${data.slug}`);
  }
}

export async function createQuestionAction(
  examId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { supabase } = await requireAdmin();
  const parsed = readQuestionInput(formData);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the question details." };
  }

  try {
    await assertQuestionMatchesExam(examId, parsed.data.type);
    const columns = toQuestionColumns(parsed.data);
    const { data: last } = await supabase
      .from("questions")
      .select("position")
      .eq("exam_id", examId)
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { error } = await supabase.from("questions").insert({
      exam_id: examId,
      position: (last?.position ?? 0) + 1,
      ...columns,
    });

    if (error) {
      return { error: error.message };
    }
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not save the question." };
  }

  await revalidateExam(examId);
  return { success: "Question added." };
}

export async function updateQuestionAction(
  examId: string,
  questionId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { supabase } = await requireAdmin();
  const parsed = readQuestionInput(formData);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the question details." };
  }

  try {
    await assertQuestionMatchesExam(examId, parsed.data.type);
    const columns = toQuestionColumns(parsed.data);
    const { error } = await supabase
      .from("questions")
      .update(columns)
      .eq("id", questionId)
      .eq("exam_id", examId);

    if (error) {
      return { error: error.message };
    }
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not save the question." };
  }

  await revalidateExam(examId);
  return { success: "Question saved." };
}

export async function deleteQuestionAction(examId: string, questionId: string) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase
    .from("questions")
    .delete()
    .eq("id", questionId)
    .eq("exam_id", examId);

  if (!error) {
    const { data: remaining } = await supabase
      .from("questions")
      .select("id")
      .eq("exam_id", examId)
      .order("position", { ascending: true });

    if (remaining) {
      await Promise.all(
        remaining.map((question, index) =>
          supabase
            .from("questions")
            .update({ position: 2000 + index })
            .eq("id", question.id),
        ),
      );
      await Promise.all(
        remaining.map((question, index) =>
          supabase
            .from("questions")
            .update({ position: index + 1 })
            .eq("id", question.id),
        ),
      );
    }
  }

  await revalidateExam(examId);
}

export async function moveQuestionAction(
  examId: string,
  questionId: string,
  direction: "up" | "down",
) {
  const { supabase } = await requireAdmin();
  const { data: questions } = await supabase
    .from("questions")
    .select("id, position")
    .eq("exam_id", examId)
    .order("position", { ascending: true });

  if (!questions) {
    return;
  }

  const index = questions.findIndex((question) => question.id === questionId);
  const swapWith = direction === "up" ? index - 1 : index + 1;

  if (index < 0 || swapWith < 0 || swapWith >= questions.length) {
    return;
  }

  const current = questions[index];
  const other = questions[swapWith];

  await supabase.from("questions").update({ position: 10_000 }).eq("id", current.id);
  await supabase.from("questions").update({ position: current.position }).eq("id", other.id);
  await supabase.from("questions").update({ position: other.position }).eq("id", current.id);
  await revalidateExam(examId);
}
