import { describe, expect, it } from "vitest";
import { parseCandidatePaper } from "@/lib/candidate/paper";
import { startAttemptSchema } from "@/lib/candidate/schemas";

describe("parseCandidatePaper", () => {
  it("keeps question text and options but drops answer keys and marks", () => {
    const paper = parseCandidatePaper({
      ok: true,
      attempt_id: "11111111-1111-4111-a111-111111111111",
      student_name: "Ada",
      started_at: "2026-01-01T10:00:00.000Z",
      expires_at: "2026-01-01T10:45:00.000Z",
      status: "active",
      exam_title: "Practice",
      exam_type: "mcq",
      duration_minutes: 45,
      server_now: "2026-01-01T10:01:00.000Z",
      questions: [
        {
          id: "q1",
          type: "single_choice",
          question_text: "2 + 2?",
          options: [{ id: "b", text: "4" }],
          correct_answer: "b",
          auto_marks: 1,
        },
      ],
      answers: { q1: { selected: ["b"], auto_marks: 1 } },
      auto_score: 1,
    });

    expect(paper?.questions[0]).toEqual({
      id: "q1",
      type: "single_choice",
      question_text: "2 + 2?",
      options: [{ id: "b", text: "4" }],
    });
    expect(paper?.answers.q1).toEqual({ selected: ["b"] });
    expect(paper).not.toHaveProperty("auto_score");
    expect(JSON.stringify(paper)).not.toContain("correct_answer");
    expect(JSON.stringify(paper)).not.toContain("auto_marks");
  });
});

describe("startAttemptSchema", () => {
  it("accepts a name and email without verifying ownership", () => {
    const parsed = startAttemptSchema.parse({
      slug: "practice-mcq",
      name: "Ada Lovelace",
      email: "ada@exam.local",
    });
    expect(parsed.email).toBe("ada@exam.local");
  });

  it("rejects an invalid email", () => {
    expect(() =>
      startAttemptSchema.parse({
        slug: "practice-mcq",
        name: "Ada",
        email: "not-an-email",
      }),
    ).toThrow();
  });
});
