import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createAttemptToken, hashAttemptToken } from "@/lib/candidate/token";
import {
  CANDIDATE_SECRET_KEYS,
  MCQ_RESULT_ALLOWED_KEYS,
  collectForbiddenKeys,
} from "@/lib/security/candidate-payload";
import type { Database, Json } from "@/lib/supabase/database.types";

const SLUG = "stage9-random";
const MIXED_SLUG = "practice-5min";
const EXPIRED_HASH = "9e09000000000000000000000000000000000000000000000000000000000001";
const APP_URL = process.env.STAGE9_APP_URL ?? "http://127.0.0.1:3000";

const runId = Date.now();
const primaryEmail = `stage9.${runId}.a@exam.local`;
const twinEmail = `stage9.${runId}.b@exam.local`;
const sharedName = "Stage Nine Twin";

function asRecord(value: Json | null): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function questionIds(paper: Record<string, unknown> | null) {
  if (!Array.isArray(paper?.questions)) {
    return [];
  }

  return paper.questions.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      return [];
    }

    const id = (item as { id?: unknown }).id;
    return typeof id === "string" ? [id] : [];
  });
}

function optionIds(paper: Record<string, unknown> | null, questionId: string) {
  if (!Array.isArray(paper?.questions)) {
    return [];
  }

  const question = paper.questions.find((item) => {
    return Boolean(item && typeof item === "object" && !Array.isArray(item) && (item as { id?: unknown }).id === questionId);
  }) as { options?: unknown } | undefined;

  if (!Array.isArray(question?.options)) {
    return [];
  }

  return question.options.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      return [];
    }

    const id = (item as { id?: unknown }).id;
    return typeof id === "string" ? [id] : [];
  });
}

describe("stage 9 live security checks", () => {
  let supabase: SupabaseClient<Database>;
  const primaryHash = hashAttemptToken(createAttemptToken());
  const resumeHash = hashAttemptToken(createAttemptToken());
  const twinHash = hashAttemptToken(createAttemptToken());
  let attemptId = "";
  let startedAt = "";
  let expiresAt = "";
  let firstQuestionId = "";
  let firstQuestionOptions: string[] = [];
  let persistedQuestionOrder: string[] = [];

  beforeAll(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
    if (!url.startsWith("https://") || !anonKey) {
      throw new Error("Supabase env is missing. Live Stage 9 checks need .env.local.");
    }

    supabase = createClient<Database>(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  });

  afterAll(async () => {
    if (attemptId) {
      await supabase.rpc("submit_candidate_attempt", {
        p_slug: SLUG,
        p_token_hash: resumeHash,
      });
    }
  });

  it("hides questions, attempts, answers and admin rows from the anonymous client", async () => {
    const [questions, attempts, answers, admins] = await Promise.all([
      supabase.from("questions").select("id, correct_answer"),
      supabase.from("attempts").select("id, session_token_hash, auto_score"),
      supabase.from("answers").select("id, auto_marks"),
      supabase.from("admin_users").select("user_id"),
    ]);

    expect(questions.data ?? []).toEqual([]);
    expect(attempts.data ?? []).toEqual([]);
    expect(answers.data ?? []).toEqual([]);
    expect(admins.data ?? []).toEqual([]);
  });

  it("lets anonymous readers see published exam metadata only", async () => {
    const { data } = await supabase
      .from("exams")
      .select("slug, published")
      .eq("slug", SLUG)
      .maybeSingle();

    expect(data).toEqual({ slug: SLUG, published: true });
  });

  it("starts an attempt and returns no marks or answer keys", async () => {
    const { data, error } = await supabase.rpc("start_or_resume_attempt", {
      p_slug: SLUG,
      p_student_name: sharedName,
      p_student_email: primaryEmail,
      p_token_hash: primaryHash,
    });

    expect(error).toBeNull();
    const row = asRecord(data);
    expect(row?.ok).toBe(true);
    expect(row?.resumed).toBe(false);
    expect(collectForbiddenKeys(data)).toEqual([]);
    attemptId = String(row?.attempt_id ?? "");
    startedAt = String(row?.started_at ?? "");
    expiresAt = String(row?.expires_at ?? "");
    expect(attemptId).toMatch(/-/);
    expect(Date.parse(expiresAt) - Date.parse(startedAt)).toBe(45 * 60 * 1000);
  });

  it("persists the same randomised order after a refresh", async () => {
    const first = asRecord(
      (
        await supabase.rpc("get_candidate_paper", {
          p_slug: SLUG,
          p_token_hash: primaryHash,
        })
      ).data ?? null,
    );
    const second = asRecord(
      (
        await supabase.rpc("get_candidate_paper", {
          p_slug: SLUG,
          p_token_hash: primaryHash,
        })
      ).data ?? null,
    );

    expect(collectForbiddenKeys(first)).toEqual([]);
    expect(collectForbiddenKeys(second)).toEqual([]);
    persistedQuestionOrder = questionIds(first);
    expect(persistedQuestionOrder.length).toBe(4);
    expect(questionIds(second)).toEqual(persistedQuestionOrder);
    firstQuestionId = persistedQuestionOrder[0] ?? "";
    firstQuestionOptions = optionIds(first, firstQuestionId);
    expect(firstQuestionOptions.length).toBeGreaterThan(1);
    expect(optionIds(second, firstQuestionId)).toEqual(firstQuestionOptions);
  });

  it("keeps saved answers after a later paper load", async () => {
    const save = await supabase.rpc("save_candidate_answer", {
      p_slug: SLUG,
      p_token_hash: primaryHash,
      p_question_id: firstQuestionId,
      p_answer: { selected: [firstQuestionOptions[0] ?? "a"] },
    });
    const saved = asRecord(save.data ?? null);
    expect(save.error).toBeNull();
    expect(saved?.ok).toBe(true);
    expect(collectForbiddenKeys(save.data ?? null)).toEqual([]);

    const paper = asRecord(
      (
        await supabase.rpc("get_candidate_paper", {
          p_slug: SLUG,
          p_token_hash: primaryHash,
        })
      ).data ?? null,
    );
    const answers = asRecord((paper?.answers as Json) ?? null);
    expect(answers?.[firstQuestionId]).toEqual({
      selected: [firstQuestionOptions[0] ?? "a"],
    });
  });

  it("resumes the same attempt without resetting the clock or order", async () => {
    const start = asRecord(
      (
        await supabase.rpc("start_or_resume_attempt", {
          p_slug: SLUG,
          p_student_name: sharedName,
          p_student_email: primaryEmail,
          p_token_hash: resumeHash,
        })
      ).data ?? null,
    );

    expect(start?.ok).toBe(true);
    expect(start?.resumed).toBe(true);
    expect(start?.attempt_id).toBe(attemptId);
    expect(start?.started_at).toBe(startedAt);
    expect(start?.expires_at).toBe(expiresAt);

    const paper = asRecord(
      (
        await supabase.rpc("get_candidate_paper", {
          p_slug: SLUG,
          p_token_hash: resumeHash,
        })
      ).data ?? null,
    );
    expect(questionIds(paper)).toEqual(persistedQuestionOrder);
    expect(optionIds(paper, firstQuestionId)).toEqual(firstQuestionOptions);
    expect(collectForbiddenKeys(paper)).toEqual([]);
  });

  it("does not return a result while the attempt is still active", async () => {
    const { data } = await supabase.rpc("get_candidate_result", {
      p_slug: SLUG,
      p_token_hash: resumeHash,
    });

    expect(asRecord(data)).toEqual({ ok: false, code: "active" });
    expect(collectForbiddenKeys(data)).toEqual([]);
  });

  it("rejects a second start from a completed email and accepts a different email with the same name", async () => {
    const firstSubmit = asRecord(
      (
        await supabase.rpc("submit_candidate_attempt", {
          p_slug: SLUG,
          p_token_hash: resumeHash,
        })
      ).data ?? null,
    );
    const secondSubmit = asRecord(
      (
        await supabase.rpc("submit_candidate_attempt", {
          p_slug: SLUG,
          p_token_hash: resumeHash,
        })
      ).data ?? null,
    );

    expect(firstSubmit).toMatchObject({ ok: true, already_locked: false, status: "submitted" });
    expect(secondSubmit).toMatchObject({ ok: true, already_locked: true, status: "submitted" });
    expect(collectForbiddenKeys(firstSubmit)).toEqual([]);

    const blocked = asRecord(
      (
        await supabase.rpc("start_or_resume_attempt", {
          p_slug: SLUG,
          p_student_name: sharedName,
          p_student_email: primaryEmail,
          p_token_hash: hashAttemptToken(createAttemptToken()),
        })
      ).data ?? null,
    );
    expect(blocked).toMatchObject({ ok: false, code: "already_completed" });

    const twin = asRecord(
      (
        await supabase.rpc("start_or_resume_attempt", {
          p_slug: SLUG,
          p_student_name: sharedName,
          p_student_email: twinEmail,
          p_token_hash: twinHash,
        })
      ).data ?? null,
    );
    expect(twin?.ok).toBe(true);
    expect(twin?.attempt_id).not.toBe(attemptId);
  });

  it("shows MCQ review after lock and keeps mixed exams confirmation-only", async () => {
    const mcq = asRecord(
      (
        await supabase.rpc("get_candidate_result", {
          p_slug: SLUG,
          p_token_hash: resumeHash,
        })
      ).data ?? null,
    );
    expect(mcq?.ok).toBe(true);
    expect(mcq?.exam_type).toBe("mcq");
    expect(mcq?.result).toBeTruthy();
    expect(
      collectForbiddenKeys(
        mcq,
        CANDIDATE_SECRET_KEYS.filter((key) => !MCQ_RESULT_ALLOWED_KEYS.includes(key as (typeof MCQ_RESULT_ALLOWED_KEYS)[number])),
      ),
    ).toEqual([]);

    const lockedPaper = asRecord(
      (
        await supabase.rpc("get_candidate_paper", {
          p_slug: SLUG,
          p_token_hash: resumeHash,
        })
      ).data ?? null,
    );
    expect(collectForbiddenKeys(lockedPaper)).toEqual([]);

    const mixed = asRecord(
      (
        await supabase.rpc("get_candidate_result", {
          p_slug: MIXED_SLUG,
          p_token_hash: "ec4caa19d246542539158d142744910416f625ccf93295069b6a3ae3db6c6086",
        })
      ).data ?? null,
    );
    if (mixed?.ok === true) {
      expect(mixed.exam_type).toBe("mixed");
      expect(mixed.result).toBeNull();
    }
  });

  it("locks overdue attempts and rejects further answer writes", async () => {
    const save = asRecord(
      (
        await supabase.rpc("save_candidate_answer", {
          p_slug: SLUG,
          p_token_hash: EXPIRED_HASH,
          p_question_id: firstQuestionId || "33333333-3333-4333-a333-333333333301",
          p_answer: { selected: ["a"] },
        })
      ).data ?? null,
    );

    expect(save).toMatchObject({ ok: false, code: "locked" });
    expect(collectForbiddenKeys(save)).toEqual([]);

    const result = asRecord(
      (
        await supabase.rpc("get_candidate_result", {
          p_slug: SLUG,
          p_token_hash: EXPIRED_HASH,
        })
      ).data ?? null,
    );
    expect(result?.ok).toBe(true);
    expect(result?.status).toBe("expired");
  });

  it("redirects unauthenticated admin pages to login", async () => {
    const routes = [
      "/admin",
      "/admin/exams/new",
      `/admin/exams/33333333-3333-4333-a333-333333333333/attempts/export`,
    ];

    for (const route of routes) {
      const response = await fetch(`${APP_URL}${route}`, {
        redirect: "manual",
        signal: AbortSignal.timeout(8000),
      });
      expect(response.status).toBe(307);
      expect(response.headers.get("location") ?? "").toContain("/admin/login");
    }
  });
});
