import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Tone = "neutral" | "brand" | "gold" | "success" | "warning" | "danger";

const tones: Record<Tone, string> = {
  neutral: "bg-surface-muted text-ink-muted border-border",
  brand: "bg-brand-soft text-brand-ink border-[#ecd3da]",
  gold: "bg-gold-soft text-[#6e5016] border-[#eadbb8]",
  success: "bg-success-soft text-success border-[#cfe5d6]",
  warning: "bg-warning-soft text-warning border-[#f0dcae]",
  danger: "bg-danger-soft text-danger border-[#f2cdc8]",
};

export function Badge({ tone = "neutral", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs font-medium", tones[tone], className)}>
      {children}
    </span>
  );
}
