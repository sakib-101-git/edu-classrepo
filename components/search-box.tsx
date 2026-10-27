import { Search } from "lucide-react";
import { cn } from "@/lib/cn";

/** Plain GET form: works without JavaScript and keeps the query in the URL. */
export function SearchBox({
  action = "/search",
  defaultValue,
  placeholder = "Search courses, instructors or materials — e.g. CSE 211",
  size = "md",
  hidden,
  label = "Search",
}: {
  action?: string;
  defaultValue?: string;
  placeholder?: string;
  size?: "md" | "lg";
  hidden?: Record<string, string>;
  label?: string;
}) {
  return (
    <form action={action} role="search" className="relative w-full">
      <label htmlFor={`q-${action}`} className="sr-only">{label}</label>
      <Search
        className={cn("pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-subtle", size === "lg" ? "size-5" : "size-4")}
        aria-hidden
      />
      <input
        id={`q-${action}`}
        type="search"
        name="q"
        defaultValue={defaultValue}
        placeholder={placeholder}
        maxLength={100}
        className={cn(
          "w-full rounded-xl border border-border-strong bg-surface text-ink shadow-sm placeholder:text-ink-subtle",
          "focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/25",
          size === "lg" ? "h-14 pl-11 pr-28 text-base" : "h-11 pl-10 pr-24 text-[0.9375rem]",
        )}
      />
      {hidden && Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <button
        type="submit"
        className={cn(
          "absolute right-1.5 top-1/2 -translate-y-1/2 rounded-lg bg-brand font-medium text-white hover:bg-brand-hover",
          size === "lg" ? "h-11 px-5 text-sm" : "h-8 px-3.5 text-sm",
        )}
      >
        Search
      </button>
    </form>
  );
}
