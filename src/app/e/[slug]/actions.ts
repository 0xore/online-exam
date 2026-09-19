"use server";

import { redirect } from "next/navigation";
import { parseStartAttemptResult } from "@/lib/candidate/attempt";
import { setAttemptToken } from "@/lib/candidate/cookie";
import { startAttemptSchema } from "@/lib/candidate/schemas";
import { createAttemptToken, hashAttemptToken } from "@/lib/candidate/token";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type ActionState = { error?: string } | null;

export async function startAttemptAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = startAttemptSchema.safeParse({
    slug: formData.get("slug"),
    name: formData.get("name"),
    email: formData.get("email"),
  });

  if (!parsed.success) {
    return { error: "Enter your full name and a valid email address." };
  }

  const token = createAttemptToken();
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("start_or_resume_attempt", {
    p_slug: parsed.data.slug,
    p_student_name: parsed.data.name,
    p_student_email: parsed.data.email,
    p_token_hash: hashAttemptToken(token),
  });

  if (error) {
    return { error: error.message };
  }

  const result = parseStartAttemptResult(data);
  if (!result.ok) {
    return { error: result.message };
  }

  const cookieUntil = Date.parse(result.expires_at) + 12 * 60 * 60 * 1000;
  const maxAge = Math.max(60, Math.ceil((cookieUntil - Date.now()) / 1000));
  await setAttemptToken(parsed.data.slug, token, maxAge);
  redirect(`/e/${parsed.data.slug}/sit`);
}
