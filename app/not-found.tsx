import { SearchX } from "lucide-react";
import { LinkButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export default function NotFound() {
  return (
    <div className="container-page py-16">
      <EmptyState
        icon={SearchX}
        title="We couldn't find that page"
        action={<LinkButton href="/courses">Browse courses</LinkButton>}
      >
        The link may be outdated, or the item may have been removed.
      </EmptyState>
    </div>
  );
}
