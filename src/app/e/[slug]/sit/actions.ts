"use server";

import { examSlugSchema, candidateAnswerSchema } from "@/lib/candidate/schemas";
import { getSessionTokenHash } from "@/lib/candidate/session";
import type { Json } from "@/lib/supabase/database.types";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type SaveAnswerResult = {
  ok: boolean;
  locked?: boolean;
  error?: string;
  savedAt?: string;
};

export type SubmitAttemptResult = {
  ok: boolean;
  locked?: boolean;
  error?: string;
};

export type SyncAttemptResult = {
  ok: boolean;
  locked?: boolean;
  status?: string;
  expiresAt?: string;
  serverNow?: string;
  error?: string;
};

function asRecord(data: Json | null): Record<string, unknown> | null {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return null;
  }

  return data as Record<string, unknown>;
}

export async function saveCandidateAnswerAction(
  slug: string,
  questionId: string,
  answer: { selected?: string[]; text?: string },
): Promise<SaveAnswerResult> {
  const parsedSlug = examSlugSchema.safeParse(slug);
  const parsedAnswer = candidateAnswerSchema.safeParse(answer);
  if (!parsedSlug.success || !parsedAnswer.success) {
    return { ok: false, error: "Could not save that answer." };
  }

  const tokenHash = await getSessionTokenHash(parsedSlug.data);
  if (!tokenHash) {
    return { ok: false, error: "This attempt is not available." };
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("save_candidate_answer", {
    p_slug: parsedSlug.data,
    p_token_hash: tokenHash,
    p_question_id: questionId,
    p_answer: parsedAnswer.data as Json,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  const row = asRecord(data);
  if (row?.ok === true) {
    return {
      ok: true,
      savedAt: typeof row.saved_at === "string" ? row.saved_at : undefined,
    };
  }

  return {
    ok: false,
    locked: row?.code === "locked",
    error: String(row?.message ?? "Could not save that answer."),
  };
}

export async function submitCandidateAttemptAction(
  slug: string,
): Promise<SubmitAttemptResult> {
  const parsedSlug = examSlugSchema.safeParse(slug);
  if (!parsedSlug.success) {
    return { ok: false, error: "This exam is not available." };
  }

  const tokenHash = await getSessionTokenHash(parsedSlug.data);
  if (!tokenHash) {
    return { ok: false, error: "This attempt is not available." };
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("submit_candidate_attempt", {
    p_slug: parsedSlug.data,
    p_token_hash: tokenHash,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  const row = asRecord(data);
  if (row?.ok === true) {
    return { ok: true, locked: true };
  }

  return {
    ok: false,
    locked: row?.code === "locked",
    error: String(row?.message ?? "Could not submit this exam."),
  };
}

export async function syncCandidateAttemptAction(
  slug: string,
): Promise<SyncAttemptResult> {
  const parsedSlug = examSlugSchema.safeParse(slug);
  if (!parsedSlug.success) {
    return { ok: false, error: "This exam is not available." };
  }

  const tokenHash = await getSessionTokenHash(parsedSlug.data);
  if (!tokenHash) {
    return { ok: false, error: "This attempt is not available." };
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("sync_candidate_attempt", {
    p_slug: parsedSlug.data,
    p_token_hash: tokenHash,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  const row = asRecord(data);
  if (row?.ok !== true) {
    return { ok: false, error: "Could not check remaining time." };
  }

  const status = typeof row.status === "string" ? row.status : "active";
  return {
    ok: true,
    locked: status !== "active",
    status,
    expiresAt: typeof row.expires_at === "string" ? row.expires_at : undefined,
    serverNow: typeof row.server_now === "string" ? row.server_now : undefined,
  };
}
