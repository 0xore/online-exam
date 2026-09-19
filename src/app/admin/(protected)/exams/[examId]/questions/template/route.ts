import { notFound } from "next/navigation";
import {
  buildQuestionExcelTemplate,
  buildQuestionWordTemplate,
} from "@/lib/admin/question-import-files";
import { isExamType } from "@/lib/admin/exam-kind";
import { requireAdmin } from "@/lib/admin/require-admin";

export async function GET(
  request: Request,
  context: { params: Promise<{ examId: string }> },
) {
  const { examId } = await context.params;
  const { supabase } = await requireAdmin();
  const { data: exam } = await supabase
    .from("exams")
    .select("id, slug, exam_type")
    .eq("id", examId)
    .maybeSingle();

  if (!exam) {
    notFound();
  }

  const format = new URL(request.url).searchParams.get("format");
  const examType = isExamType(exam.exam_type) ? exam.exam_type : "mixed";

  if (format === "docx") {
    const body = await buildQuestionWordTemplate(examType);
    return new Response(new Uint8Array(body), {
      headers: {
        "content-type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "content-disposition": `attachment; filename="${exam.slug}-questions.docx"`,
      },
    });
  }

  const body = await buildQuestionExcelTemplate(examType);
  return new Response(new Uint8Array(body), {
    headers: {
      "content-type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": `attachment; filename="${exam.slug}-questions.xlsx"`,
    },
  });
}
