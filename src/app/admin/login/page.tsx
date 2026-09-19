import { redirect } from "next/navigation";
import { LoginForm } from "@/app/admin/login/login-form";
import { Eyebrow, Panel } from "@/components/shell";
import { getAdminContext } from "@/lib/admin/require-admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type LoginPageProps = PageProps<"/admin/login">;

export default async function AdminLoginPage({ searchParams }: LoginPageProps) {
  const context = await getAdminContext();
  if (context.user && context.isAdmin) {
    redirect("/admin");
  }

  const supabase = await createServerSupabaseClient();
  const { data: hasAdmins } = await supabase.rpc("has_admin_users");
  const params = await searchParams;
  const errorMessage =
    params.error === "forbidden"
      ? "This account is not an administrator."
      : undefined;

  return (
    <Panel className="mx-auto w-full max-w-md">
      <Eyebrow>Administrator</Eyebrow>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Sign in</h1>
      <p className="mt-3 text-sm leading-6 text-muted">
        {hasAdmins
          ? "Use your administrator email and password."
          : "Create the first administrator account. No confirmation email is sent."}
      </p>
      <div className="mt-6">
        <LoginForm hasAdmins={Boolean(hasAdmins)} errorMessage={errorMessage} />
      </div>
    </Panel>
  );
}
