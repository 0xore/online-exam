"use client";

import { useState } from "react";

export function CopyExamUrl({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false);
  const path = `/e/${slug}`;

  async function copy() {
    const url = `${window.location.origin}${path}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <code className="rounded-full bg-background px-3 py-1 text-sm">{path}</code>
      <button
        type="button"
        onClick={copy}
        className="rounded-full bg-sky px-3 py-1.5 text-sm font-semibold text-ink"
      >
        {copied ? "Copied" : "Copy public URL"}
      </button>
    </div>
  );
}
