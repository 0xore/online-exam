import type { AttemptStatus, ExamType, Json } from "@/lib/supabase/database.types";

export type StartAttemptSuccess = {
  ok: true;
  resumed: boolean;
  attempt_id: string;
  started_at: string;
  expires_at: string;
  status: AttemptStatus;
  server_now: string;
};

export type StartAttemptFailure = {
  ok: false;
  code: string;
  message: string;
};

export type CandidateAttempt = {
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

export function parseStartAttemptResult(
  data: Json | null,
): StartAttemptSuccess | StartAttemptFailure {
  const row = asRecord(data);
  if (!row) {
    return { ok: false, code: "invalid", message: "Could not start the exam." };
  }

  if (row.ok === true && typeof row.started_at === "string" && typeof row.expires_at === "string") {
    return {
      ok: true,
      resumed: row.resumed === true,
      attempt_id: String(row.attempt_id ?? ""),
      started_at: row.started_at,
      expires_at: row.expires_at,
      status: asStatus(row.status),
      server_now: typeof row.server_now === "string" ? row.server_now : new Date().toISOString(),
    };
  }

  return {
    ok: false,
    code: String(row.code ?? "error"),
    message: String(row.message ?? "Could not start the exam."),
  };
}

export function parseCandidateAttempt(data: Json | null): CandidateAttempt | null {
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
  };
}

export function remainingMs(
  expiresAt: string,
  serverNow: string,
  elapsedMs = 0,
) {
  return Date.parse(expiresAt) - Date.parse(serverNow) - elapsedMs;
}

export function formatClock(totalMs: number) {
  const safe = Math.max(0, Math.floor(totalMs / 1000));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  const pad = (value: number) => String(value).padStart(2, "0");

  if (hours > 0) {
    return `${hours}:${pad(minutes)}:${pad(seconds)}`;
  }

  return `${minutes}:${pad(seconds)}`;
}

export function formatAttemptTime(value: string) {
  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "medium",
  });
}
