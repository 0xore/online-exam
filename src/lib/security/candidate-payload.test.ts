import { describe, expect, it } from "vitest";
import {
  CANDIDATE_SECRET_KEYS,
  collectForbiddenKeys,
} from "@/lib/security/candidate-payload";

describe("candidate payload scanning", () => {
  it("accepts a paper-shaped payload with no answer keys or marks", () => {
    expect(
      collectForbiddenKeys({
        ok: true,
        status: "active",
        questions: [{ id: "q1", question_text: "2 + 2?", options: [{ id: "b", text: "4" }] }],
        answers: { q1: { selected: ["b"] } },
      }),
    ).toEqual([]);
  });

  it("finds nested answer keys and scores", () => {
    expect(
      collectForbiddenKeys({
        questions: [{ correct_answer: "b", acceptable_answers: ["paris"] }],
        attempt: { auto_score: 1, session_token_hash: "abc" },
      }),
    ).toEqual(["acceptable_answers", "auto_score", "correct_answer", "session_token_hash"]);
  });

  it("keeps the candidate secret list focused on keys and marks", () => {
    expect(CANDIDATE_SECRET_KEYS).toContain("correct_answer");
    expect(CANDIDATE_SECRET_KEYS).toContain("auto_marks");
  });
});
