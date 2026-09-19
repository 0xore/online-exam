import { AppShell } from "@/components/shell";

export default function ExamLayout({ children }: LayoutProps<"/e">) {
  return (
    <AppShell
      brandHref="/"
      brandLabel="Examination"
      width="max-w-5xl"
      nav={
        <p className="hidden text-sm text-muted sm:block">Candidate session</p>
      }
    >
      {children}
    </AppShell>
  );
}
