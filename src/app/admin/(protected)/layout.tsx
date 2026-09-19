import Link from "next/link";
import { logoutAction } from "@/app/admin/actions";
import { requireAdmin } from "@/lib/admin/require-admin";

export default async function ProtectedAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await requireAdmin();

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[28px] bg-card px-4 py-3 shadow-[0_18px_50px_rgba(16,16,17,0.06)]">
        <nav className="flex flex-wrap items-center gap-4 text-sm">
          <Link href="/admin" className="font-semibold text-ink">
            Exams
          </Link>
          <Link href="/admin/exams/new?type=mcq" className="text-muted hover:text-ink">
            New MCQ
          </Link>
          <Link href="/admin/exams/new?type=mixed" className="text-muted hover:text-ink">
            New mixed
          </Link>
        </nav>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-muted">{user?.email}</span>
          <form action={logoutAction}>
            <button type="submit" className="rounded-full bg-background px-3 py-1.5 font-semibold">
              Sign out
            </button>
          </form>
        </div>
      </div>
      {children}
    </div>
  );
}
