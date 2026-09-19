"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { fromDateTimeLocal } from "@/lib/admin/datetime";
import { requireAdmin } from "@/lib/admin/require-admin";
import { examSchema, loginSchema } from "@/lib/admin/schemas";
import { slugify } from "@/lib/admin/slug";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type ActionState = { error?: string; success?: string } | null;

function readCheckbox(formData: FormData, name: string) {
  return formData.get(name) === "on" || formData.get(name) === "true";
}

export async function adminAuthAction(
  prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (formData.get("intent") === "setup") {
    return createFirstAdminAction(prev, formData);
  }

  return loginAction(prev, formData);
}

export async function loginAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: "Enter a valid email and a password of at least 8 characters." };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return { error: error.message };
  }

  redirect("/admin");
}

export async function createFirstAdminAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: "Enter a valid email and a password of at least 8 characters." };
  }

  const supabase = await createServerSupabaseClient();
  const { data: hasAdmins, error: hasAdminError } = await supabase.rpc(
    "has_admin_users",
  );

  if (hasAdminError) {
    return { error: hasAdminError.message };
  }

  if (hasAdmins) {
    return { error: "An administrator already exists. Sign in instead." };
  }

  const { data: provisioned, error: provisionError } = await supabase.rpc(
    "provision_first_admin",
    {
      p_email: parsed.data.email,
      p_password: parsed.data.password,
    },
  );

  if (provisionError) {
    return { error: provisionError.message };
  }

  if (!provisioned) {
    return { error: "An administrator already exists. Sign in instead." };
  }

  const { error: signInError } = await supabase.auth.signInWithPassword(parsed.data);
  if (signInError) {
    return { error: signInError.message };
  }

  redirect("/admin");
}

export async function logoutAction() {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}

function readExamInput(formData: FormData) {
  const rawPass = String(formData.get("pass_mark") ?? "").trim();
  const title = String(formData.get("title") ?? "");
  const slugInput = String(formData.get("slug") ?? "").trim();

  return examSchema.safeParse({
    title,
    slug: slugInput || slugify(title),
    description: String(formData.get("description") ?? ""),
    duration_minutes: formData.get("duration_minutes"),
    pass_mark: rawPass === "" ? Number.NaN : Number(rawPass),
    available_from: String(formData.get("available_from") ?? ""),
    available_until: String(formData.get("available_until") ?? ""),
    exam_type: String(formData.get("exam_type") ?? "mixed"),
    published: readCheckbox(formData, "published"),
    randomise_questions: readCheckbox(formData, "randomise_questions"),
    randomise_options: readCheckbox(formData, "randomise_options"),
  });
}

export async function createExamAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { supabase } = await requireAdmin();
  const parsed = readExamInput(formData);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the exam details." };
  }

  const { data, error } = await supabase
    .from("exams")
    .insert({
      title: parsed.data.title,
      slug: parsed.data.slug,
      description: parsed.data.description || null,
      duration_minutes: parsed.data.duration_minutes,
      exam_type: parsed.data.exam_type,
      pass_mark: Number.isNaN(parsed.data.pass_mark) ? null : parsed.data.pass_mark,
      available_from: fromDateTimeLocal(parsed.data.available_from ?? ""),
      available_until: fromDateTimeLocal(parsed.data.available_until ?? ""),
      published: parsed.data.published,
      settings: {
        randomise_questions: parsed.data.randomise_questions,
        randomise_options: parsed.data.randomise_options,
      },
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "Could not create the exam." };
  }

  revalidatePath("/admin");
  redirect(`/admin/exams/${data.id}`);
}

export async function updateExamAction(
  examId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { supabase } = await requireAdmin();
  const parsed = readExamInput(formData);

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the exam details." };
  }

  const { error } = await supabase
    .from("exams")
    .update({
      title: parsed.data.title,
      slug: parsed.data.slug,
      description: parsed.data.description || null,
      duration_minutes: parsed.data.duration_minutes,
      exam_type: parsed.data.exam_type,
      pass_mark: Number.isNaN(parsed.data.pass_mark) ? null : parsed.data.pass_mark,
      available_from: fromDateTimeLocal(parsed.data.available_from ?? ""),
      available_until: fromDateTimeLocal(parsed.data.available_until ?? ""),
      published: parsed.data.published,
      settings: {
        randomise_questions: parsed.data.randomise_questions,
        randomise_options: parsed.data.randomise_options,
      },
    })
    .eq("id", examId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin");
  revalidatePath(`/admin/exams/${examId}`);
  revalidatePath(`/e/${parsed.data.slug}`);
  return { success: "Exam saved." };
}

export async function deleteExamAction(examId: string) {
  const { supabase } = await requireAdmin();
  const { error } = await supabase.from("exams").delete().eq("id", examId);

  if (error) {
    redirect(`/admin/exams/${examId}?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/admin");
  redirect("/admin");
}
