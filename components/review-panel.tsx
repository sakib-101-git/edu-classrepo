"use client";

import { useActionState } from "react";
import { Check, X } from "lucide-react";
import { reviewMaterialAction } from "@/app/actions/admin";
import { idle } from "@/lib/action-state";
import type { FacultyMember, Material } from "@/lib/types";
import { useActionToast } from "./ui/action-form";
import { Field, Input, Select, Textarea } from "./ui/field";
import { SubmitButton } from "./ui/submit-button";

/**
 * Approve (optionally fixing the title and instructor) or reject a pending
 * material. Instructors for the material's course are listed first.
 */
export function ReviewPanel({
  material,
  faculty,
  courseFacultyIds,
}: {
  material: Material;
  faculty: FacultyMember[];
  courseFacultyIds: string[];
}) {
  const [approveState, approve] = useActionState(reviewMaterialAction, idle);
  const [rejectState, reject] = useActionState(reviewMaterialAction, idle);
  useActionToast(approveState);
  useActionToast(rejectState);
  const id = material.id;
  const forCourse = faculty.filter((f) => courseFacultyIds.includes(f.id));
  const others = faculty.filter((f) => !courseFacultyIds.includes(f.id));
  const label = (f: FacultyMember) => (f.shortForm ? `${f.name} (${f.shortForm})` : f.name);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <form action={approve} className="space-y-3 rounded-lg border border-border bg-bg p-4">
        <input type="hidden" name="decision" value="approve" />
        <input type="hidden" name="id" value={id} />
        <Field label="Title" htmlFor={`title-${id}`}>
          <Input id={`title-${id}`} name="title" defaultValue={material.title} required maxLength={200} />
        </Field>
        <Field
          label="Instructor"
          htmlFor={`faculty-${id}`}
          hint={material.suggestedFaculty ? `Uploader suggested: “${material.suggestedFaculty}”` : undefined}
        >
          <Select id={`faculty-${id}`} name="facultyId" defaultValue={material.faculty?.id ?? ""}>
            <option value="">Not specified</option>
            {forCourse.length > 0 && (
              <optgroup label="Teaches this course">
                {forCourse.map((f) => <option key={f.id} value={f.id}>{label(f)}</option>)}
              </optgroup>
            )}
            <optgroup label="All instructors">
              {others.map((f) => <option key={f.id} value={f.id}>{label(f)}</option>)}
            </optgroup>
          </Select>
        </Field>
        <SubmitButton className="w-full" pendingLabel="Approving…">
          <Check className="size-4" aria-hidden /> Approve &amp; publish
        </SubmitButton>
      </form>
      <form action={reject} className="space-y-3 rounded-lg border border-border bg-bg p-4">
        <input type="hidden" name="decision" value="reject" />
        <input type="hidden" name="id" value={id} />
        <Field label="Reason" htmlFor={`reason-${id}`} optional hint="Shown to the uploader.">
          <Textarea id={`reason-${id}`} name="reason" maxLength={500} placeholder="e.g. Duplicate of an existing file, or wrong course" />
        </Field>
        <SubmitButton variant="secondary" className="w-full text-danger" pendingLabel="Rejecting…">
          <X className="size-4" aria-hidden /> Reject &amp; delete file
        </SubmitButton>
      </form>
    </div>
  );
}
