import { describe, expect, it } from "vitest";
import { parseDocxTables } from "@/lib/admin/question-import-files";
import { importQuestionRows as parseRows, tableToObjects } from "@/lib/admin/question-import";

describe("question import rows", () => {
  it("imports a single-choice row and maps the correct letter", () => {
    const result = parseRows(
      tableToObjects([
        ["type", "question", "marks", "option_a", "option_b", "option_c", "correct"],
        ["single_choice", "What is 2 + 2?", "1", "3", "4", "5", "b"],
      ]),
      "mcq",
    );

    expect(result).toEqual({
      ok: true,
      questions: [
        {
          type: "single_choice",
          question_text: "What is 2 + 2?",
          marks: 1,
          options: [
            { id: "a", text: "3" },
            { id: "b", text: "4" },
            { id: "c", text: "5" },
          ],
          correct_answer: "b",
          acceptable_answers: null,
        },
      ],
    });
  });

  it("accepts multiple correct letters and true/false aliases", () => {
    const result = parseRows(
      [
        {
          type: "multiple_choice",
          question: "Primes?",
          marks: "2",
          option_a: "2",
          option_b: "3",
          option_c: "4",
          correct: "a;b",
          acceptable_answers: "",
        },
        {
          type: "true_false",
          question: "Earth is a planet",
          marks: "1",
          correct: "True",
        },
      ],
      "mcq",
    );

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.questions[0]?.correct_answer).toEqual(["a", "b"]);
    expect(result.questions[1]).toMatchObject({
      type: "true_false",
      correct_answer: "true",
    });
  });

  it("rejects written questions on an MCQ exam and empty sheets", () => {
    const written = parseRows(
      [
        {
          type: "short_answer",
          question: "Capital?",
          marks: "1",
          acceptable_answers: "paris",
        },
      ],
      "mcq",
    );
    expect(written.ok).toBe(false);
    if (!written.ok) {
      expect(written.errors[0]).toMatch(/not allowed on MCQ/i);
    }

    expect(parseRows([], "mixed")).toEqual({
      ok: false,
      errors: ["No questions found. Keep the header row and add at least one question."],
    });
  });

  it("imports short-answer variants on mixed exams", () => {
    const result = parseRows(
      [
        {
          type: "short_answer",
          question: "Capital of France?",
          marks: "1",
          acceptable_answers: "paris;Paris, France",
        },
      ],
      "mixed",
    );
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.questions[0]).toMatchObject({
      type: "short_answer",
      acceptable_answers: ["paris", "paris, france"],
    });
  });
});

describe("template files", () => {
  it("round-trips Excel questions for an MCQ exam", async () => {
    const { buildQuestionExcelTemplate, parseQuestionImportFile } = await import(
      "@/lib/admin/question-import-files"
    );
    const ExcelJS = (await import("exceljs")).default;
    const empty = await buildQuestionExcelTemplate("mcq");
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(empty);
    workbook.getWorksheet("Questions")?.addRow([
      "single_choice",
      "Capital of Nigeria?",
      "1",
      "Lagos",
      "Abuja",
      "Kano",
      "",
      "",
      "",
      "b",
      "",
    ]);
    const filled = Buffer.from(await workbook.xlsx.writeBuffer());
    const file = new File([filled], "questions.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const result = await parseQuestionImportFile(file, "mcq");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.questions).toHaveLength(1);
      expect(result.questions[0]?.correct_answer).toBe("b");
    }
  });
});

describe("docx table parse", () => {
  it("reads the first questions table from Word XML", () => {
    const xml = `
      <w:document><w:body>
        <w:tbl>
          <w:tr><w:tc><w:t>type</w:t></w:tc><w:tc><w:t>question</w:t></w:tc></w:tr>
          <w:tr><w:tc><w:t>true_false</w:t></w:tc><w:tc><w:t>Sky is blue</w:t></w:tc></w:tr>
        </w:tbl>
      </w:body></w:document>
    `;
    expect(parseDocxTables(xml)[0]?.[1]).toEqual(["true_false", "Sky is blue"]);
  });
});
