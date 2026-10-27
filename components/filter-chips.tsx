import Link from "next/link";
import { cn } from "@/lib/cn";

/** A row of link "chips" for a single-choice filter that lives in the URL. */
export function FilterChips({
  label,
  options,
}: {
  label: string;
  options: { label: string; href: string; active: boolean; count?: number }[];
}) {
  return (
    <nav aria-label={label} className="-mx-1 flex flex-wrap gap-1.5">
      {options.map((o) => (
        <Link
          key={o.href + o.label}
          href={o.href}
          aria-current={o.active ? "true" : undefined}
          scroll={false}
          className={cn(
            "mx-0.5 rounded-full border px-3 py-1.5 text-sm transition-colors",
            o.active
              ? "border-brand bg-brand text-white"
              : "border-border-strong bg-surface text-ink-muted hover:border-ink-subtle hover:text-ink",
          )}
        >
          {o.label}
          {o.count !== undefined && <span className={cn("ml-1.5", o.active ? "text-white/80" : "text-ink-subtle")}>{o.count}</span>}
        </Link>
      ))}
    </nav>
  );
}
