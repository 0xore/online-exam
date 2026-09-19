import Link from "next/link";

export function BrandMark({
  href = "/",
  label = "Examination",
}: {
  href?: string;
  label?: string;
}) {
  return (
    <Link href={href} className="flex items-center gap-2.5">
      <span className="grid h-9 w-9 place-items-center rounded-2xl bg-sky text-sm font-extrabold text-ink">
        E
      </span>
      <span className="text-sm font-semibold tracking-tight">{label}</span>
    </Link>
  );
}
