import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function getAdminContext() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { supabase, user: null, isAdmin: false };
  }

  const { data: adminRow } = await supabase
    .from("admin_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (adminRow) {
    return { supabase, user, isAdmin: true };
  }

  const { data: bootstrapped } = await supabase.rpc("bootstrap_first_admin");
  return { supabase, user, isAdmin: Boolean(bootstrapped) };
}

export async function requireAdmin() {
  const context = await getAdminContext();

  if (!context.user) {
    redirect("/admin/login");
  }

  if (!context.isAdmin) {
    await context.supabase.auth.signOut();
    redirect("/admin/login?error=forbidden");
  }

  return context;
}
