import { Trash2 } from "lucide-react";
import { deleteCatalogItemAction } from "@/app/actions/admin";
import { ActionButton } from "@/components/ui/action-form";

export function DeleteCatalogItem({ id, kind, name, body }: { id: string; kind: "department" | "faculty" | "course"; name: string; body: string }) {
  return (
    <ActionButton
      action={deleteCatalogItemAction}
      fields={{ id, kind }}
      variant="ghost"
      className="[&_button]:text-danger"
      confirm={{ title: `Delete ${name}?`, body, confirmLabel: "Delete" }}
    >
      <Trash2 className="size-4" aria-hidden /> <span className="sr-only sm:not-sr-only">Delete</span>
    </ActionButton>
  );
}
