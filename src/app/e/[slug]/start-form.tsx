"use client";

import { useActionState } from "react";
import { startAttemptAction } from "@/app/e/[slug]/actions";

type StartFormProps = {
  slug: string;
};

export function StartForm({ slug }: StartFormProps) {
  const [state, submit, pending] = useActionState(startAttemptAction, null);

  return (
    <form action={submit} className="mt-6 space-y-4">
      <input type="hidden" name="slug" value={slug} />
      {state?.error ? (
        <p className="rounded-2xl bg-blush/50 px-4 py-3 text-sm">
          {state.error}
        </p>
      ) : null}
      <label className="block space-y-1 text-sm">
        <span className="font-medium">Full name</span>
        <input
          name="name"
          required
          minLength={2}
          maxLength={120}
          autoComplete="name"
          className="w-full rounded-2xl border border-border bg-white px-3.5 py-2.5"
        />
      </label>
      <label className="block space-y-1 text-sm">
        <span className="font-medium">Email</span>
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          className="w-full rounded-2xl border border-border bg-white px-3.5 py-2.5"
        />
      </label>
      <p className="text-sm leading-6 text-muted">
        Use the same email to resume an active attempt. The timer will not
        restart.
      </p>
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full bg-sky px-4 py-2.5 text-sm font-semibold text-ink disabled:opacity-60"
      >
        {pending ? "Starting..." : "Start or resume"}
      </button>
    </form>
  );
}
