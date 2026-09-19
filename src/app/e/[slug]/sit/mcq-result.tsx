import { formatScore } from "@/lib/admin/scores";
import { StatTile } from "@/components/shell";
import type { CandidateMcqResult } from "@/lib/candidate/result";

export function McqResult({ result }: { result: CandidateMcqResult }) {
  return (
    <div className="mt-6 space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile
          label="Automatic score"
          value={`${formatScore(result.auto_score)} / ${formatScore(result.max_score)}`}
          tone="sky"
        />
        <StatTile
          label="Result"
          value={result.passed == null ? "Complete" : result.passed ? "Pass" : "Fail"}
          tone={result.passed === false ? "blush" : "gold"}
        />
        <StatTile
          label="Pass mark"
          value={result.pass_mark == null ? "—" : formatScore(result.pass_mark)}
          tone="blush"
        />
      </div>

      {result.questions.map((question, index) => (
        <article
          key={question.id}
          className={`rounded-[22px] px-4 py-4 ${
            question.is_correct ? "bg-sky/20" : "bg-blush/40"
          }`}
        >
          <p className="text-sm font-medium text-muted">
            Question {index + 1} · {question.is_correct ? "Correct" : "Incorrect"}
          </p>
          <h2 className="mt-2 whitespace-pre-wrap text-base font-semibold leading-7">
            {question.question_text}
          </h2>
          <p className="mt-3 text-sm">
            <span className="font-medium">Your answer: </span>
            {question.selected.length > 0
              ? question.selected.map((option) => option.text).join(", ")
              : "No answer"}
          </p>
          <p className="mt-1 text-sm">
            <span className="font-medium">Correct answer: </span>
            {question.correct.map((option) => option.text).join(", ")}
          </p>
        </article>
      ))}
    </div>
  );
}
