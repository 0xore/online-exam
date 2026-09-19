import { describe, expect, it } from "vitest";
import {
  parseCandidateAttempt,
  parseStartAttemptResult,
  remainingMs,
} from "@/lib/candidate/attempt";
import { hashAttemptToken } from "@/lib/candidate/token";

describe("server-authoritative remaining time", () => {
  it("uses expires_at and server_now, not the local clock", () => {
    const expiresAt = "2026-01-01T10:45:00.000Z";
    const serverNow = "2026-01-01T10:00:00.000Z";

    expect(remainingMs(expiresAt, serverNow)).toBe(45 * 60 * 1000);
    expect(remainingMs(expiresAt, serverNow, 30_000)).toBe(45 * 60 * 1000 - 30_000);
  });

  it("does not grow when the caller pretends more wall time has passed without elapsedMs", () => {
    const expiresAt = "2026-01-01T10:45:00.000Z";
    const serverNow = "2026-01-01T10:00:00.000Z";
    const first = remainingMs(expiresAt, serverNow, 0);
    const later = remainingMs(expiresAt, serverNow, 0);

    expect(later).toBe(first);
  });
});

describe("attempt parsers", () => {
  it("parses a start/resume payload without keeping marks", () => {
    const parsed = parseStartAttemptResult({
      ok: true,
      resumed: true,
      attempt_id: "11111111-1111-4111-a111-111111111111",
      started_at: "2026-01-01T10:00:00.000Z",
      expires_at: "2026-01-01T10:45:00.000Z",
      status: "active",
      server_now: "2026-01-01T10:01:00.000Z",
      auto_score: 9,
    });

    expect(parsed).toMatchObject({
      ok: true,
      resumed: true,
      attempt_id: "11111111-1111-4111-a111-111111111111",
    });
    expect(parsed).not.toHaveProperty("auto_score");
  });

  it("returns null when the attempt RPC is not ok", () => {
    expect(parseCandidateAttempt({ ok: false, code: "not_found" })).toBeNull();
  });
});

describe("attempt tokens", () => {
  it("hashes the opaque token with SHA-256", () => {
    expect(hashAttemptToken("demo-token")).toMatch(/^[0-9a-f]{64}$/);
    expect(hashAttemptToken("demo-token")).not.toBe("demo-token");
  });
});
