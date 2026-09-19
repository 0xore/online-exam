import { describe, expect, it } from "vitest";
import { parseCandidateResult } from "@/lib/candidate/result";

describe("parseCandidateResult", () => {
  it("returns null while the attempt is still active", () => {
    expect(parseCandidateResult({ ok: false, code: "active" })).toBeNull();
  });

  it("keeps mixed locked attempts confirmation-only", () => {
    const parsed = parseCandidateResult({
      ok: true,
      exam_type: "mixed",
      status: "submitted",
      result: null,
    });

    expect(parsed).toEqual({
      ok: true,
      exam_type: "mixed",
      status: "submitted",
      result: null,
    });
  });

  it("parses a locked MCQ review", () => {
    const parsed = parseCandidateResult({
      ok: true,
      exam_type: "mcq",
      status: "submitted",
      result: {
        auto_score: 2,
        max_score: 4,
        pass_mark: 3,
        passed: false,
        questions: [
          {
            id: "q1",
            question_text: "2 + 2?",
            selected: [{ id: "b", text: "4" }],
            correct: [{ id: "b", text: "4" }],
            is_correct: true,
          },
        ],
      },
    });

    expect(parsed?.result?.passed).toBe(false);
    expect(parsed?.result?.questions[0]?.is_correct).toBe(true);
  });
});
