import Link from "next/link";
import { AppShell } from "@/components/shell";

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <AppShell
      brandHref="/admin"
      brandLabel="Administrator"
      nav={
        <nav className="flex items-center gap-4">
          <Link href="/" className="text-muted hover:text-ink">
            Home
          </Link>
          <Link href="/admin" className="font-medium text-ink">
            Dashboard
          </Link>
        </nav>
      }
    >
      {children}
    </AppShell>
  );
}
