"use client";

import { RotateCcw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="container-page py-16">
      <EmptyState
        icon={TriangleAlert}
        title="Something went wrong"
        action={
          <Button onClick={reset}>
            <RotateCcw className="size-4" aria-hidden /> Try again
          </Button>
        }
      >
        This page couldn&apos;t load. Check your connection and try again. If it keeps happening, the service may be
        temporarily unavailable.
      </EmptyState>
    </div>
  );
}
