import type { ReactNode } from "react";
import { BrandMark } from "./brand";

export function AuthCard({ title, description, children, footer }: { title: string; description?: ReactNode; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="container-page flex justify-center py-12 sm:py-16">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <BrandMark size={44} />
          <h1 className="mt-4 text-[1.75rem] font-semibold">{title}</h1>
          {description && <div className="mt-2 text-ink-muted">{description}</div>}
        </div>
        <div className="card p-6">{children}</div>
        {footer && <div className="mt-5 text-center text-sm text-ink-muted">{footer}</div>}
      </div>
    </div>
  );
}
