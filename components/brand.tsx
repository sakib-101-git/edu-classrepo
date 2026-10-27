import Link from "next/link";

export function BrandMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <rect width="32" height="32" rx="8" fill="var(--color-brand)" />
      <path d="M6.5 10.2c3.2-1.6 6.3-1.6 9.5.2v12.4c-3.2-1.8-6.3-1.8-9.5-.2z" fill="#fff" />
      <path d="M25.5 10.2c-3.2-1.6-6.3-1.6-9.5.2v12.4c3.2-1.8 6.3-1.8 9.5-.2z" fill="#fff" opacity=".85" />
      <path d="M9 6.8 16 4l7 2.8-7 2.8z" fill="var(--color-gold)" />
    </svg>
  );
}

export function Brand() {
  return (
    <Link href="/" className="flex items-center gap-2.5 rounded-md" aria-label="EDU ClassRepo home">
      <BrandMark />
      <span className="leading-tight">
        <span className="block font-serif text-[1.05rem] font-semibold text-ink">EDU ClassRepo</span>
        <span className="hidden text-xs text-ink-subtle sm:block">East Delta University</span>
      </span>
    </Link>
  );
}
