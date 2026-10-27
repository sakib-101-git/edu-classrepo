"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { saveCourseAction, saveDepartmentAction, saveFacultyAction } from "@/app/actions/admin";
import { useActionToast, useFormAction } from "@/components/ui/action-form";
import { FormMessage } from "@/components/ui/alert";
import { LinkButton } from "@/components/ui/button";
import { describedBy, Field, Input, Select } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import type { ActionState } from "@/lib/action-state";
import type { Department, FacultyMember } from "@/lib/types";

type Action = (prev: ActionState, form: FormData) => Promise<ActionState>;

/** Shared wrapper: toast on result, reset + close the editor after a save. */
function CatalogForm({
  action,
  id,
  closeHref,
  title,
  children,
}: {
  action: Action;
  id: string | null;
  closeHref: string;
  title: string;
  children: (errors: Record<string, string>) => ReactNode;
}) {
  const router = useRouter();
  const { state, onSubmit, pending } = useFormAction(action);
  // Remount the fields after each successful save so they start empty again.
  const [savedState, setSavedState] = useState<ActionState | null>(null);
  const [version, setVersion] = useState(0);
  if (state.ok && state !== savedState) {
    setSavedState(state);
    setVersion(version + 1);
  }
  useActionToast(state);
  useEffect(() => {
    if (state.ok) router.replace(closeHref, { scroll: false });
  }, [state, closeHref, router]);
  const errors = state.fieldErrors ?? {};

  return (
    <form onSubmit={onSubmit} className="card mb-8 space-y-5 p-5 sm:p-6" aria-label={title}>
      <h2 className="text-lg font-semibold">{title}</h2>
      {!state.ok && state.message && <FormMessage state={state} />}
      {id && <input type="hidden" name="id" value={id} />}
      <div key={version} className="space-y-5">{children(errors)}</div>
      <div className="flex gap-2">
        <SubmitButton pending={pending} pendingLabel="Saving…">{id ? "Save changes" : "Add"}</SubmitButton>
        {id && <LinkButton href={closeHref} variant="ghost" scroll={false}>Cancel</LinkButton>}
      </div>
    </form>
  );
}

export function DepartmentForm({ department }: { department: Department | null }) {
  return (
    <CatalogForm
      key={department?.id ?? "new"}
      action={saveDepartmentAction}
      id={department?.id ?? null}
      closeHref="/admin/departments"
      title={department ? `Edit ${department.code}` : "Add a department"}
    >
      {(e) => (
        <div className="grid gap-4 sm:grid-cols-[10rem_1fr]">
          <Field label="Code" htmlFor="code" error={e.code} hint="e.g. CSE">
            <Input id="code" name="code" defaultValue={department?.code} required maxLength={12} className="uppercase"
              invalid={Boolean(e.code)} aria-describedby={describedBy("code", e.code, true)} />
          </Field>
          <Field label="Name" htmlFor="name" error={e.name}>
            <Input id="name" name="name" defaultValue={department?.name} required maxLength={120}
              invalid={Boolean(e.name)} aria-describedby={describedBy("name", e.name)} />
          </Field>
        </div>
      )}
    </CatalogForm>
  );
}

export function FacultyForm({ member, departments }: { member: FacultyMember | null; departments: Department[] }) {
  return (
    <CatalogForm
      key={member?.id ?? "new"}
      action={saveFacultyAction}
      id={member?.id ?? null}
      closeHref="/admin/faculty"
      title={member ? `Edit ${member.name}` : "Add an instructor"}
    >
      {(e) => (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name" htmlFor="name" error={e.name}>
            <Input id="name" name="name" defaultValue={member?.name} required maxLength={150} invalid={Boolean(e.name)} />
          </Field>
          <Field label="Short form" htmlFor="shortForm" optional error={e.shortForm} hint="Initials used on routines, e.g. MRH">
            <Input id="shortForm" name="shortForm" defaultValue={member?.shortForm ?? ""} maxLength={12} className="uppercase" invalid={Boolean(e.shortForm)} />
          </Field>
          <Field label="Email" htmlFor="email" optional error={e.email}>
            <Input id="email" name="email" type="email" defaultValue={member?.email ?? ""} maxLength={150} invalid={Boolean(e.email)} />
          </Field>
          <Field label="Department" htmlFor="departmentId" optional error={e.departmentId}>
            <Select id="departmentId" name="departmentId" defaultValue={member?.departmentId ?? ""}>
              <option value="">—</option>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.code} — {d.name}</option>)}
            </Select>
          </Field>
        </div>
      )}
    </CatalogForm>
  );
}

interface EditableCourse {
  id: string;
  code: string;
  title: string;
  departmentId: string;
  creditHours: number | null;
  facultyIds: string[];
}

function InstructorPicker({ faculty, initial }: { faculty: FacultyMember[]; initial: string[] }) {
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState(() => new Set(initial));
  const visible = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return q ? faculty.filter((f) => f.name.toLowerCase().includes(q) || (f.shortForm ?? "").toLowerCase().includes(q)) : faculty;
  }, [faculty, filter]);

  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">Instructors <span className="font-normal text-ink-subtle">({selected.size} selected)</span></legend>
      {[...selected].map((id) => <input key={id} type="hidden" name="facultyIds" value={id} />)}
      <Input aria-label="Filter instructors" placeholder="Filter by name or short form" value={filter} onChange={(e) => setFilter(e.target.value)} />
      <div className="max-h-56 overflow-y-auto rounded-lg border border-border-strong bg-surface p-1">
        {visible.length === 0 && <p className="px-2 py-3 text-sm text-ink-subtle">No instructors match.</p>}
        {visible.map((f) => (
          <label key={f.id} className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm hover:bg-surface-muted">
            <input
              type="checkbox"
              className="size-4 accent-[var(--color-brand)]"
              checked={selected.has(f.id)}
              onChange={(e) => {
                const next = new Set(selected);
                if (e.target.checked) next.add(f.id);
                else next.delete(f.id);
                setSelected(next);
              }}
            />
            {f.name}
            {f.shortForm && <span className="text-xs text-ink-subtle">{f.shortForm}</span>}
            {f.departmentCode && <span className="ml-auto text-xs text-ink-subtle">{f.departmentCode}</span>}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function CourseForm({
  course,
  departments,
  faculty,
}: {
  course: EditableCourse | null;
  departments: Department[];
  faculty: FacultyMember[];
}) {
  return (
    <CatalogForm
      key={course?.id ?? "new"}
      action={saveCourseAction}
      id={course?.id ?? null}
      closeHref="/admin/courses"
      title={course ? `Edit ${course.code}` : "Add a course"}
    >
      {(e) => (
        <>
          <div className="grid gap-4 sm:grid-cols-[10rem_1fr]">
            <Field label="Code" htmlFor="code" error={e.code} hint="e.g. CSE 211">
              <Input id="code" name="code" defaultValue={course?.code} required maxLength={20} className="uppercase" invalid={Boolean(e.code)} />
            </Field>
            <Field label="Title" htmlFor="title" error={e.title}>
              <Input id="title" name="title" defaultValue={course?.title} required maxLength={250} invalid={Boolean(e.title)} />
            </Field>
            <Field label="Credit hours" htmlFor="creditHours" optional error={e.creditHours}>
              <Input id="creditHours" name="creditHours" type="number" step="0.5" min="0.5" max="12" defaultValue={course?.creditHours ?? ""} invalid={Boolean(e.creditHours)} />
            </Field>
            <Field label="Department" htmlFor="departmentId" error={e.departmentId}>
              <Select id="departmentId" name="departmentId" defaultValue={course?.departmentId ?? ""} required invalid={Boolean(e.departmentId)}>
                <option value="">Select…</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.code} — {d.name}</option>)}
              </Select>
            </Field>
          </div>
          <InstructorPicker faculty={faculty} initial={course?.facultyIds ?? []} />
        </>
      )}
    </CatalogForm>
  );
}
