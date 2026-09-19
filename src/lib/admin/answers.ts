import type { Json } from "@/lib/supabase/database.types";

type Option = { id: string; text: string };

export function asOptions(value: Json | null): Option[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      return [];
    }

    const row = item as Record<string, unknown>;
    const id = typeof row.id === "string" ? row.id : "";
    const text = typeof row.text === "string" ? row.text : "";
    return id ? [{ id, text }] : [];
  });
}

export function asIdList(value: Json | null): string[] {
  if (typeof value === "string") {
    return [value];
  }

  if (Array.isArray(value)) {
    return value.map((item) => String(item));
  }

  return [];
}

export function formatSelectedAnswer(
  answer: Json | null,
  options: Option[],
): string {
  if (!answer || typeof answer !== "object" || Array.isArray(answer)) {
    return "No answer saved";
  }

  const row = answer as Record<string, unknown>;
  if (typeof row.text === "string") {
    const text = row.text.trim();
    return text || "No answer saved";
  }

  const selected = Array.isArray(row.selected)
    ? row.selected.map((item) => String(item))
    : [];
  if (selected.length === 0) {
    return "No answer saved";
  }

  return selected
    .map((id) => options.find((option) => option.id === id)?.text ?? id)
    .join(", ");
}

export function formatCorrectAnswer(
  correct: Json | null,
  acceptable: Json | null,
  options: Option[],
): string {
  if (Array.isArray(acceptable) && acceptable.length > 0) {
    return acceptable.map((item) => String(item)).join(", ");
  }

  const ids = asIdList(correct);
  if (ids.length === 0) {
    return "No key";
  }

  return ids
    .map((id) => options.find((option) => option.id === id)?.text ?? id)
    .join(", ");
}
