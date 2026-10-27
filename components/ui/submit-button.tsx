"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { Button } from "./button";
import type { ComponentProps } from "react";

type Props = ComponentProps<typeof Button> & { pendingLabel?: string; pending?: boolean };

/** Submit button that disables itself and shows progress while its form runs. */
export function SubmitButton({ children, pendingLabel, disabled, pending: pendingProp, ...props }: Props) {
  const status = useFormStatus();
  const pending = pendingProp || status.pending;
  return (
    <Button type="submit" disabled={pending || disabled} aria-disabled={pending || disabled} {...props}>
      {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
      {pending && pendingLabel ? pendingLabel : children}
    </Button>
  );
}
