import { notFound } from "next/navigation";
import { toCsv } from "@/lib/admin/csv";
import { formatScore } from "@/lib/admin/scores";
import { requireAdmin } from "@/lib/admin/require-admin";

export async function GET(
  _request: Request,
  context: RouteContext<"/admin/exams/[examId]/attempts/export">,
) {
  const { examId } = await context.params;
  const { supabase } = await requireAdmin();
  const { data: exam } = await supabase
    .from("exams")
    .select("id, title, slug, pass_mark")
    .eq("id", examId)
    .maybeSingle();

  if (!exam) {
    notFound();
  }

  const { data: attempts } = await supabase
    .from("attempts")
    .select(
      "student_name, student_email, status, started_at, expires_at, submitted_at, auto_score, manual_score, final_score",
    )
    .eq("exam_id", examId)
    .order("started_at", { ascending: false });

  const rows = [
    [
      "name",
      "email",
      "status",
      "started_at",
      "expires_at",
      "submitted_at",
      "auto_score",
      "manual_score",
      "final_score",
      "result",
    ],
    ...(attempts ?? []).map((attempt) => {
      const passed =
        exam.pass_mark == null || attempt.final_score == null
          ? ""
          : Number(attempt.final_score) >= Number(exam.pass_mark)
            ? "pass"
            : "fail";
      return [
        attempt.student_name,
        attempt.student_email,
        attempt.status,
        attempt.started_at,
        attempt.expires_at,
        attempt.submitted_at,
        formatScore(attempt.auto_score),
        formatScore(attempt.manual_score),
        formatScore(attempt.final_score),
        passed,
      ];
    }),
  ];

  return new Response(toCsv(rows), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${exam.slug}-results.csv"`,
    },
  });
}
