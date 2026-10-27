import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

const control =
  "w-full rounded-lg border bg-surface px-3 text-[0.9375rem] text-ink placeholder:text-ink-subtle " +
  "transition-colors focus:outline-none focus:ring-2 focus:ring-brand/25 focus:border-brand " +
  "disabled:bg-surface-muted disabled:text-ink-subtle";

const borderFor = (invalid?: boolean) => (invalid ? "border-danger" : "border-border-strong");

export function Input({ className, invalid, ...props }: ComponentProps<"input"> & { invalid?: boolean }) {
  return <input aria-invalid={invalid || undefined} className={cn(control, "h-10", borderFor(invalid), className)} {...props} />;
}

export function Textarea({ className, invalid, ...props }: ComponentProps<"textarea"> & { invalid?: boolean }) {
  return (
    <textarea aria-invalid={invalid || undefined} className={cn(control, "py-2 min-h-24", borderFor(invalid), className)} {...props} />
  );
}

export function Select({ className, invalid, ...props }: ComponentProps<"select"> & { invalid?: boolean }) {
  return (
    <select aria-invalid={invalid || undefined} className={cn(control, "h-10 pr-8", borderFor(invalid), className)} {...props} />
  );
}

interface FieldProps {
  label: ReactNode;
  htmlFor: string;
  error?: string;
  hint?: ReactNode;
  optional?: boolean;
  children: ReactNode;
  className?: string;
}

/** Label + control + hint/error, with the ids wired for screen readers. */
export function Field({ label, htmlFor, error, hint, optional, children, className }: FieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-ink">
        {label}
        {optional && <span className="ml-1 font-normal text-ink-subtle">(optional)</span>}
      </label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} className="text-sm text-danger">{error}</p>
      ) : hint ? (
        <p id={`${htmlFor}-hint`} className="text-sm text-ink-subtle">{hint}</p>
      ) : null}
    </div>
  );
}

/** aria-describedby value matching Field's hint/error ids. */
export function describedBy(id: string, error?: string, hint?: boolean): string | undefined {
  if (error) return `${id}-error`;
  return hint ? `${id}-hint` : undefined;
}
