import type { Json } from "@/lib/supabase/database.types";

export const CANDIDATE_SECRET_KEYS = [
  "acceptable_answers",
  "auto_marks",
  "auto_score",
  "correct_answer",
  "final_score",
  "manual_marks",
  "manual_score",
  "marker_comment",
  "session_token_hash",
] as const;

export const MCQ_RESULT_ALLOWED_KEYS = ["auto_score"] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function collectForbiddenKeys(
  value: unknown,
  forbidden: readonly string[] = CANDIDATE_SECRET_KEYS,
): string[] {
  const found = new Set<string>();

  const walk = (node: unknown) => {
    if (Array.isArray(node)) {
      for (const item of node) {
        walk(item);
      }
      return;
    }

    if (!isRecord(node)) {
      return;
    }

    for (const [key, child] of Object.entries(node)) {
      if (forbidden.includes(key)) {
        found.add(key);
      }
      walk(child);
    }
  };

  walk(value);
  return [...found].sort();
}

export function assertNoCandidateSecrets(
  value: Json | null,
  forbidden: readonly string[] = CANDIDATE_SECRET_KEYS,
) {
  const leaked = collectForbiddenKeys(value, forbidden);
  if (leaked.length > 0) {
    throw new Error(`Candidate payload leaked ${leaked.join(", ")}`);
  }
}
