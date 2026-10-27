import type { Department } from "@/lib/types";
import { describedBy, Field, Input, Select } from "./ui/field";

export interface ProfileDefaults {
  fullName: string;
  studentId: string | null;
  departmentId: string | null;
  semester: number | null;
}

/** Name / student ID / department / semester inputs, shared by sign-up and account. */
export function ProfileFields({
  departments,
  defaults,
  errors = {},
}: {
  departments: Department[];
  defaults: ProfileDefaults;
  errors?: Record<string, string>;
}) {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <Field label="Full name" htmlFor="fullName" error={errors.fullName} className="sm:col-span-2">
        <Input
          id="fullName"
          name="fullName"
          autoComplete="name"
          defaultValue={defaults.fullName}
          required
          maxLength={100}
          invalid={Boolean(errors.fullName)}
          aria-describedby={describedBy("fullName", errors.fullName)}
        />
      </Field>
      <Field label="Student ID" htmlFor="studentId" optional error={errors.studentId}>
        <Input
          id="studentId"
          name="studentId"
          defaultValue={defaults.studentId ?? ""}
          maxLength={30}
          invalid={Boolean(errors.studentId)}
          aria-describedby={describedBy("studentId", errors.studentId)}
        />
      </Field>
      <Field label="Semester" htmlFor="semester" optional error={errors.semester}>
        <Select id="semester" name="semester" defaultValue={defaults.semester ? String(defaults.semester) : ""}>
          <option value="">—</option>
          {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </Select>
      </Field>
      <Field label="Department" htmlFor="departmentId" optional error={errors.departmentId} className="sm:col-span-2">
        <Select id="departmentId" name="departmentId" defaultValue={defaults.departmentId ?? ""}>
          <option value="">—</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
          ))}
        </Select>
      </Field>
    </div>
  );
}
