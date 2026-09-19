import { Document, HeadingLevel, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } from "docx";
import ExcelJS from "exceljs";
import JSZip from "jszip";
import {
  QUESTION_IMPORT_HEADERS,
  exampleImportRows,
  importQuestionRows,
  questionImportInstructions,
  tableToObjects,
  type QuestionImportResult,
} from "@/lib/admin/question-import";
import type { ExamType } from "@/lib/admin/exam-kind";

const MAX_IMPORT_BYTES = 2 * 1024 * 1024;

function toExcelBuffer(value: Uint8Array) {
  return Buffer.from(value.buffer, value.byteOffset, value.byteLength) as unknown as Buffer;
}

export function detectQuestionImportKind(fileName: string, mimeType = "") {
  const name = fileName.toLowerCase();
  if (name.endsWith(".xlsx") || mimeType.includes("spreadsheetml")) {
    return "xlsx" as const;
  }
  if (name.endsWith(".docx") || mimeType.includes("wordprocessingml")) {
    return "docx" as const;
  }
  return null;
}

function decodeXml(value: string) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'");
}

function docxCellText(cellXml: string) {
  return [...cellXml.matchAll(/<w:t\b[^>]*>([^<]*)<\/w:t>/g)]
    .map((match) => decodeXml(match[1] ?? ""))
    .join("")
    .trim();
}

export function parseDocxTables(xml: string): string[][][] {
  return [...xml.matchAll(/<w:tbl\b[\s\S]*?<\/w:tbl>/g)].map((table) =>
    [...table[0].matchAll(/<w:tr\b[\s\S]*?<\/w:tr>/g)].map((row) =>
      [...row[0].matchAll(/<w:tc\b[\s\S]*?<\/w:tc>/g)].map((cell) =>
        docxCellText(cell[0]),
      ),
    ),
  );
}

function pickQuestionsTable(tables: string[][][]): string[][] {
  const match = tables.find((table) => {
    const headers = (table[0] ?? []).map((cell) => cell.trim().toLowerCase());
    return headers.includes("type") && headers.includes("question");
  });
  return match ?? tables[0] ?? [];
}

export async function parseQuestionImportFile(
  file: File,
  examType: ExamType,
): Promise<QuestionImportResult> {
  if (file.size > MAX_IMPORT_BYTES) {
    return { ok: false, errors: ["The file is larger than 2 MB."] };
  }

  const kind = detectQuestionImportKind(file.name, file.type);
  if (!kind) {
    return {
      ok: false,
      errors: ["Upload an Excel .xlsx file or a Word .docx file from the template."],
    };
  }

  const bytes = new Uint8Array(await file.arrayBuffer());

  if (kind === "xlsx") {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(toExcelBuffer(bytes) as never);
    const sheet =
      workbook.getWorksheet("Questions") ??
      workbook.worksheets.find((item) => item.name !== "Instructions" && item.name !== "Examples") ??
      workbook.worksheets[0];
    if (!sheet) {
      return { ok: false, errors: ["The spreadsheet has no Questions sheet."] };
    }

    let maxCol = 1;
    sheet.eachRow((row) => {
      maxCol = Math.max(maxCol, row.cellCount);
    });
    const rows: string[][] = [];
    sheet.eachRow({ includeEmpty: false }, (row) => {
      const values: string[] = [];
      for (let column = 1; column <= maxCol; column += 1) {
        values.push(String(row.getCell(column).text ?? "").trim());
      }
      rows.push(values);
    });
    return importQuestionRows(tableToObjects(rows), examType);
  }

  const zip = await JSZip.loadAsync(bytes);
  const documentXml = await zip.file("word/document.xml")?.async("string");
  if (!documentXml) {
    return { ok: false, errors: ["That Word file does not contain a readable document."] };
  }

  const table = pickQuestionsTable(parseDocxTables(documentXml));
  if (table.length === 0) {
    return { ok: false, errors: ["The Word file needs a table with type and question columns."] };
  }

  return importQuestionRows(tableToObjects(table), examType);
}

function writeHeaderRow(sheet: ExcelJS.Worksheet) {
  const header = sheet.addRow([...QUESTION_IMPORT_HEADERS]);
  header.font = { bold: true };
  header.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF37BEFF" },
    };
  });
}

export async function buildQuestionExcelTemplate(examType: ExamType) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Online Examination Platform";

  const instructions = workbook.addWorksheet("Instructions");
  instructions.getColumn(1).width = 110;
  instructions.addRow(["Question import template"]);
  instructions.getRow(1).font = { bold: true, size: 16 };
  questionImportInstructions(examType).forEach((line) => {
    instructions.addRow([line]);
  });

  const questions = workbook.addWorksheet("Questions");
  writeHeaderRow(questions);
  QUESTION_IMPORT_HEADERS.forEach((header, index) => {
    questions.getColumn(index + 1).width = header === "question" ? 48 : 18;
  });
  questions.getColumn(2).width = 56;
  questions.views = [{ state: "frozen", ySplit: 1 }];

  const examples = workbook.addWorksheet("Examples");
  writeHeaderRow(examples);
  exampleImportRows(examType).forEach((row) => examples.addRow(row));
  QUESTION_IMPORT_HEADERS.forEach((header, index) => {
    examples.getColumn(index + 1).width = header === "question" ? 48 : 18;
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return new Uint8Array(buffer);
}

function textCell(text: string, bold = false) {
  return new TableCell({
    width: { size: 12, type: WidthType.PERCENTAGE },
    children: [
      new Paragraph({
        children: [new TextRun({ text, bold, size: 18 })],
      }),
    ],
  });
}

function tableFromRows(rows: string[][], header = false) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows.map(
      (row, rowIndex) =>
        new TableRow({
          children: row.map((cell) => textCell(cell, header && rowIndex === 0)),
        }),
    ),
  });
}

export async function buildQuestionWordTemplate(examType: ExamType) {
  const emptyRows = Array.from({ length: 8 }, () =>
    QUESTION_IMPORT_HEADERS.map(() => ""),
  );
  const document = new Document({
    sections: [
      {
        children: [
          new Paragraph({
            text: "Question import template",
            heading: HeadingLevel.HEADING_1,
          }),
          ...questionImportInstructions(examType).map(
            (line) => new Paragraph({ text: line, spacing: { after: 120 } }),
          ),
          new Paragraph({
            text: "Questions",
            heading: HeadingLevel.HEADING_2,
          }),
          tableFromRows([[...QUESTION_IMPORT_HEADERS], ...emptyRows], true),
          new Paragraph({
            text: "Examples — do not leave these in the Questions table unless you want them imported",
            heading: HeadingLevel.HEADING_2,
          }),
          tableFromRows([[...QUESTION_IMPORT_HEADERS], ...exampleImportRows(examType)], true),
        ],
      },
    ],
  });

  return new Uint8Array(await Packer.toBuffer(document));
}
