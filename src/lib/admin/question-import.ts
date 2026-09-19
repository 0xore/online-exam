import { allowedQuestionTypes, isMcqQuestionType, type ExamType } from "@/lib/admin/exam-kind";
import { optionId, toQuestionColumns } from "@/lib/admin/question-columns";
import { questionSchema, questionTypeSchema } from "@/lib/admin/schemas";
import type { QuestionType } from "@/lib/supabase/database.types";

export const QUESTION_IMPORT_HEADERS = [
  "type",
  "question",
  "marks",
  "option_a",
  "option_b",
  "option_c",
  "option_d",
  "option_e",
  "option_f",
  "correct",
  "acceptable_answers",
] as const;

export type QuestionImportRow = Record<string, string>;
export type QuestionInsert = ReturnType<typeof toQuestionColumns>;

export type QuestionImportResult =
  | { ok: true; questions: QuestionInsert[] }
  | { ok: false; errors: string[] };

const TYPE_ALIASES: Record<string, QuestionType> = {
  single_choice: "single_choice",
  single: "single_choice",
  "single-choice": "single_choice",
  "single choice": "single_choice",
  mcq: "single_choice",
  multiple_choice: "multiple_choice",
  multiple: "multiple_choice",
  multi: "multiple_choice",
  "multiple-choice": "multiple_choice",
  "multiple choice": "multiple_choice",
  true_false: "true_false",
  "true/false": "true_false",
  "true-false": "true_false",
  "true false": "true_false",
  tf: "true_false",
  short_answer: "short_answer",
  short: "short_answer",
  "short-answer": "short_answer",
  "short answer": "short_answer",
  long_answer: "long_answer",
  long: "long_answer",
  essay: "long_answer",
  "long-answer": "long_answer",
  "long answer": "long_answer",
};

export function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/[\s-]+/g, "_");
}

export function tableToObjects(rows: string[][]): QuestionImportRow[] {
  const headerRow = rows[0];
  if (!headerRow) {
    return [];
  }

  const headers = headerRow.map((header) => {
    const name = normalizeHeader(header);
    if (/^option_[a-f]$/.test(name)) {
      return name;
    }
    const numbered = {
      option_1: "option_a",
      option_2: "option_b",
      option_3: "option_c",
      option_4: "option_d",
      option_5: "option_e",
      option_6: "option_f",
    } as const;
    if (name in numbered) {
      return numbered[name as keyof typeof numbered];
    }
    if (name === "question_text" || name === "prompt") {
      return "question";
    }
    if (name === "question_type") {
      return "type";
    }
    if (name === "mark") {
      return "marks";
    }
    if (name === "correct_answer" || name === "answer" || name === "answers") {
      return "correct";
    }
    if (name === "acceptable" || name === "acceptable_answer") {
      return "acceptable_answers";
    }
    return name;
  });

  return rows.slice(1).map((row) => {
    const record: QuestionImportRow = {};
    headers.forEach((header, index) => {
      if (!header) {
        return;
      }
      record[header] = String(row[index] ?? "").trim();
    });
    return record;
  });
}

function splitList(value: string) {
  return value
    .split(/[;\n|]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function resolveType(value: string): QuestionType | null {
  const key = value.trim().toLowerCase();
  return TYPE_ALIASES[key] ?? null;
}

function trueFalseOptions() {
  return [
    { id: "true", text: "True" },
    { id: "false", text: "False" },
  ];
}

function readOptions(row: QuestionImportRow) {
  return ["a", "b", "c", "d", "e", "f"]
    .map((letter, index) => ({
      id: optionId(index),
      text: (row[`option_${letter}`] ?? "").trim(),
    }))
    .filter((option) => option.text.length > 0);
}

function resolveCorrectIds(
  type: QuestionType,
  raw: string,
  options: { id: string; text: string }[],
) {
  const tokens = splitList(raw).map((token) => token.toLowerCase());
  if (type === "true_false") {
    return tokens.map((token) => {
      if (token === "true" || token === "t" || token === "yes" || token === "a") {
        return "true";
      }
      if (token === "false" || token === "f" || token === "no" || token === "b") {
        return "false";
      }
      return token;
    });
  }

  return tokens.map((token) => {
    const byId = options.find((option) => option.id === token);
    if (byId) {
      return byId.id;
    }
    const byText = options.find(
      (option) => option.text.trim().toLowerCase() === token,
    );
    return byText?.id ?? token;
  });
}

export function importQuestionRows(
  rows: QuestionImportRow[],
  examType: ExamType,
): QuestionImportResult {
  const errors: string[] = [];
  const questions: QuestionInsert[] = [];
  const allowed = allowedQuestionTypes(examType);

  rows.forEach((row, index) => {
    const line = index + 2;
    const questionText = (row.question ?? "").trim();
    if (!questionText && !row.type && !row.correct && !row.marks) {
      return;
    }
    if (!questionText) {
      errors.push(`Row ${line}: add the question text.`);
      return;
    }

    const type = resolveType(row.type ?? "");
    if (!type || !questionTypeSchema.safeParse(type).success) {
      errors.push(
        `Row ${line}: type must be single_choice, multiple_choice, true_false, short_answer, or long_answer.`,
      );
      return;
    }

    if (!allowed.includes(type)) {
      errors.push(
        `Row ${line}: ${type} questions are not allowed on ${examType === "mcq" ? "MCQ" : "mixed"} exams.`,
      );
      return;
    }

    const options = type === "true_false" ? trueFalseOptions() : readOptions(row);
    const correct = resolveCorrectIds(type, row.correct ?? "", options);
    const acceptable = splitList(row.acceptable_answers ?? "").map((value) =>
      value.toLowerCase(),
    );

    const parsed = questionSchema.safeParse({
      type,
      question_text: questionText,
      marks: row.marks || 1,
      options: isMcqQuestionType(type) ? options : undefined,
      correct_option_ids: correct,
      acceptable_answers: acceptable,
    });

    if (!parsed.success) {
      errors.push(
        `Row ${line}: ${parsed.error.issues[0]?.message ?? "Check this question."}`,
      );
      return;
    }

    try {
      questions.push(toQuestionColumns(parsed.data));
    } catch (error) {
      errors.push(
        `Row ${line}: ${error instanceof Error ? error.message : "Could not import this question."}`,
      );
    }
  });

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  if (questions.length === 0) {
    return { ok: false, errors: ["No questions found. Keep the header row and add at least one question."] };
  }

  return { ok: true, questions };
}

export function exampleImportRows(examType: ExamType): string[][] {
  const mcq: string[][] = [
    [
      "single_choice",
      "What is 2 + 2?",
      "1",
      "3",
      "4",
      "5",
      "",
      "",
      "",
      "b",
      "",
    ],
    [
      "multiple_choice",
      "Which of these are prime numbers?",
      "2",
      "2",
      "3",
      "4",
      "9",
      "",
      "",
      "a;b",
      "",
    ],
    ["true_false", "The earth is a planet.", "1", "", "", "", "", "", "", "True", ""],
  ];

  if (examType === "mcq") {
    return mcq;
  }

  return [
    ...mcq,
    ["short_answer", "What is the capital of France?", "1", "", "", "", "", "", "", "", "paris;paris, france"],
    ["long_answer", "Explain why candidates should not share an exam link password.", "5", "", "", "", "", "", "", "", ""],
  ];
}

export function questionImportInstructions(examType: ExamType) {
  const types =
    examType === "mcq"
      ? "single_choice, multiple_choice, true_false"
      : "single_choice, multiple_choice, true_false, short_answer, long_answer";

  return [
    "Use the Questions sheet or table. Keep the header row. Add one question per row.",
    `Allowed type values: ${types}.`,
    "For single-choice and multiple-choice, fill option_a, option_b, and more options as needed.",
    "Put the correct option letter in correct. Use a;b for more than one correct option.",
    "For true_false, leave the option columns blank and set correct to True or False.",
    "For short_answer, put acceptable variants in acceptable_answers, separated by semicolons.",
    "For long_answer / essay, leave options, correct, and acceptable_answers blank.",
    "Marks default to 1 if you leave that cell empty.",
    "The Examples sheet is only a guide. It is not imported.",
    "Save as .xlsx (Excel) or .docx (Word). Legacy .doc and .xls files are not accepted.",
  ];
}
