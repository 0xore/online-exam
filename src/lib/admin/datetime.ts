export function toDateTimeLocal(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function fromDateTimeLocal(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  if (!text) {
    return null;
  }

  const date = new Date(text);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

export function formatExamWindow(
  availableFrom: string | null,
  availableUntil: string | null,
) {
  if (!availableFrom && !availableUntil) {
    return "Always available while published";
  }

  const format = (value: string) =>
    new Date(value).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });

  if (availableFrom && availableUntil) {
    return `${format(availableFrom)} – ${format(availableUntil)}`;
  }

  if (availableFrom) {
    return `From ${format(availableFrom)}`;
  }

  return `Until ${format(availableUntil as string)}`;
}
