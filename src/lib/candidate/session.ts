import { parseCandidateAttempt } from "@/lib/candidate/attempt";
import { getAttemptToken } from "@/lib/candidate/cookie";
import { parseCandidatePaper } from "@/lib/candidate/paper";
import { parseCandidateResult } from "@/lib/candidate/result";
import { hashAttemptToken } from "@/lib/candidate/token";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function getSessionTokenHash(slug: string) {
  const token = await getAttemptToken(slug);
  return token ? hashAttemptToken(token) : null;
}

export async function getSessionAttempt(slug: string) {
  const tokenHash = await getSessionTokenHash(slug);
  if (!tokenHash) {
    return null;
  }

  const supabase = await createServerSupabaseClient();
  const { data } = await supabase.rpc("get_candidate_attempt", {
    p_slug: slug,
    p_token_hash: tokenHash,
  });

  return parseCandidateAttempt(data);
}

export async function getSessionPaper(slug: string) {
  const tokenHash = await getSessionTokenHash(slug);
  if (!tokenHash) {
    return { paper: null, error: null };
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("get_candidate_paper", {
    p_slug: slug,
    p_token_hash: tokenHash,
  });

  if (error) {
    return { paper: null, error: error.message };
  }

  const paper = parseCandidatePaper(data);
  return {
    paper,
    error: paper ? null : "This attempt is not available.",
  };
}

export async function getSessionResult(slug: string) {
  const tokenHash = await getSessionTokenHash(slug);
  if (!tokenHash) {
    return null;
  }

  const supabase = await createServerSupabaseClient();
  const { data } = await supabase.rpc("get_candidate_result", {
    p_slug: slug,
    p_token_hash: tokenHash,
  });

  return parseCandidateResult(data);
}
