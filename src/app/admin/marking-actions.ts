"use server";

import { revalidatePath } from "next/cache";
import { totalsFromAnswers } from "@/lib/admin/scores";
import { requireAdmin } from "@/lib/admin/require-admin";

type ActionState = { error?: string; success?: string } | null;

export async function saveManualMarkAction(
  examId: string,
  attemptId: string,
  answerId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { supabase } = await requireAdmin();
  const rawMarks = String(formData.get("manual_marks") ?? "").trim();
  const comment = String(formData.get("marker_comment") ?? "").trim();

  let manualMarks: number | null = null;
  if (rawMarks !== "") {
    const parsed = Number(rawMarks);
    if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
      return { error: "Enter a mark between 0 and 100, or leave it blank." };
    }
    manualMarks = parsed;
  }

  const { data: answer, error: answerError } = await supabase
    .from("answers")
    .select("id, attempt_id, question_id")
    .eq("id", answerId)
    .eq("attempt_id", attemptId)
    .maybeSingle();

  if (answerError || !answer) {
    return { error: answerError?.message ?? "That answer was not found." };
  }

  const { error: updateError } = await supabase
    .from("answers")
    .update({
      manual_marks: manualMarks,
      marker_comment: comment || null,
    })
    .eq("id", answerId);

  if (updateError) {
    return { error: updateError.message };
  }

  const { data: answers } = await supabase
    .from("answers")
    .select("auto_marks, manual_marks")
    .eq("attempt_id", attemptId);

  const totals = totalsFromAnswers(answers ?? []);
  const { error: scoreError } = await supabase
    .from("attempts")
    .update(totals)
    .eq("id", attemptId)
    .eq("exam_id", examId);

  if (scoreError) {
    return { error: scoreError.message };
  }

  revalidatePath(`/admin/exams/${examId}/attempts`);
  revalidatePath(`/admin/exams/${examId}/attempts/${attemptId}`);
  return { success: "Mark saved." };
}
