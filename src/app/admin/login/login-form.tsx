"use client";

import { useActionState } from "react";
import { adminAuthAction } from "@/app/admin/actions";

type LoginFormProps = {
  hasAdmins: boolean;
  errorMessage?: string;
};

export function LoginForm({ hasAdmins, errorMessage }: LoginFormProps) {
  const [state, submit, pending] = useActionState(adminAuthAction, null);
  const message = errorMessage || state?.error;

  return (
    <form action={submit} className="space-y-4">
      {message ? (
        <p className="rounded-2xl bg-blush/50 px-4 py-3 text-sm">
          {message}
        </p>
      ) : null}

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
      <label className="block space-y-1 text-sm">
        <span className="font-medium">Password</span>
        <input
          type="password"
          name="password"
          required
          minLength={8}
          autoComplete={hasAdmins ? "current-password" : "new-password"}
          className="w-full rounded-2xl border border-border bg-white px-3.5 py-2.5"
        />
      </label>
      <button
        type="submit"
        name="intent"
        value="login"
        disabled={pending}
        className="w-full rounded-full bg-sky px-4 py-2.5 text-sm font-semibold text-ink disabled:opacity-60"
      >
        {pending ? "Working..." : "Sign in"}
      </button>
      {!hasAdmins ? (
        <button
          type="submit"
          name="intent"
          value="setup"
          disabled={pending}
          className="w-full rounded-full bg-background px-4 py-2.5 text-sm font-semibold disabled:opacity-60"
        >
          Create first administrator
        </button>
      ) : null}
    </form>
  );
}
