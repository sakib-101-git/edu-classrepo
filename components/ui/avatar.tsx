/* eslint-disable @next/next/no-img-element -- avatars come from storage with their own sizes */
import { cn } from "@/lib/cn";

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "")).toUpperCase() || "?";
}

export function Avatar({ name, src, size = 32, className }: { name: string; src: string | null; size?: number; className?: string }) {
  const style = { width: size, height: size };
  if (src) {
    return <img src={src} alt="" style={style} className={cn("rounded-full object-cover bg-surface-muted", className)} />;
  }
  return (
    <span
      aria-hidden
      style={{ ...style, fontSize: size * 0.38 }}
      className={cn("grid place-items-center rounded-full bg-brand-soft font-semibold text-brand", className)}
    >
      {initials(name)}
    </span>
  );
}
