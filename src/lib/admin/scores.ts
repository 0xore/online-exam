export function numberOrZero(value: number | string | null | undefined) {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? amount : 0;
}

export function formatScore(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  return numberOrZero(value).toFixed(2).replace(/\.00$/, "");
}

export function totalsFromAnswers(
  answers: Array<{
    auto_marks: number | string | null;
    manual_marks: number | string | null;
  }>,
) {
  return answers.reduce(
    (totals, answer) => {
      const auto = numberOrZero(answer.auto_marks);
      const manual = numberOrZero(answer.manual_marks);
      const final = answer.manual_marks == null ? auto : manual;
      return {
        auto_score: totals.auto_score + auto,
        manual_score: totals.manual_score + manual,
        final_score: totals.final_score + final,
      };
    },
    { auto_score: 0, manual_score: 0, final_score: 0 },
  );
}
