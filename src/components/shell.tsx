import type { ReactNode } from "react";
import { BrandMark } from "@/components/brand";

export function AppShell({
  brandHref,
  brandLabel,
  nav,
  children,
  width = "max-w-6xl",
}: {
  brandHref: string;
  brandLabel: string;
  nav?: ReactNode;
  children: ReactNode;
  width?: string;
}) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-background">
      <header className={`mx-auto w-full ${width} px-5 pt-5 sm:px-6`}>
        <div className="flex items-center justify-between gap-4 rounded-[28px] bg-card px-4 py-3 shadow-[0_18px_50px_rgba(16,16,17,0.06)]">
          <BrandMark href={brandHref} label={brandLabel} />
          <div className="flex items-center gap-4 text-sm">{nav}</div>
        </div>
      </header>
      <main className={`mx-auto flex w-full ${width} flex-1 flex-col px-5 py-8 sm:px-6`}>
        {children}
      </main>
    </div>
  );
}

export function Panel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-[28px] bg-card p-6 shadow-[0_18px_50px_rgba(16,16,17,0.06)] sm:p-8 ${className}`}
    >
      {children}
    </section>
  );
}

export function StatTile({
  label,
  value,
  tone = "sky",
}: {
  label: string;
  value: ReactNode;
  tone?: "sky" | "blush" | "gold";
}) {
  const tones = {
    sky: "bg-sky/25",
    blush: "bg-blush/50",
    gold: "bg-gold/50",
  };

  return (
    <div className={`rounded-[22px] px-4 py-4 ${tones[tone]}`}>
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight text-ink">{value}</p>
    </div>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="text-sm font-medium text-muted">{children}</p>
  );
}
