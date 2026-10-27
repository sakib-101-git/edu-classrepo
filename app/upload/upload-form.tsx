"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { CheckCircle2, FileUp, Loader2 } from "lucide-react";
import { discardUploadAction, finishUploadAction, startUploadAction } from "@/app/actions/materials";
import { Alert } from "@/components/ui/alert";
import { Button, LinkButton } from "@/components/ui/button";
import { describedBy, Field, Input, Select, Textarea } from "@/components/ui/field";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/env";
import { formatBytes, MATERIAL_ACCEPT, MATERIAL_TYPES, MAX_MATERIAL_BYTES, resolveMaterialType, titleFromFileName } from "@/lib/files";
import type { CourseOption, FacultyMember, MaterialStatus, UploadTarget } from "@/lib/types";
import { fieldErrors, materialMetaSchema, type FieldErrors } from "@/lib/validation";

type Phase = { name: "idle" } | { name: "uploading" } | { name: "saving" } | { name: "done"; id: string; status: MaterialStatus };

const OTHER = "__other__";

async function sendFile(target: UploadTarget, file: File, contentType: string): Promise<void> {
  // Re-type the blob so storage records the validated type, not whatever the
  // browser guessed from the file name.
  const body = new Blob([file], { type: contentType });
  if (target.kind === "demo") {
    const res = await fetch(target.url, { method: "PUT", body, headers: { "Content-Type": contentType } });
    if (!res.ok) throw new Error(((await res.json().catch(() => ({}))) as { error?: string }).error ?? "Upload failed");
    return;
  }
  // The signed upload token authorises this one path; no session is needed here.
  const { createClient } = await import("@supabase/supabase-js");
  const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await client.storage.from("materials").uploadToSignedUrl(target.path, target.token, body, { contentType });
  if (error) throw new Error(error.message.includes("size") ? "The file is larger than the storage limit." : "Upload failed. Check your connection and try again.");
}

export function UploadForm({
  courses,
  faculty,
  initialCourseId,
  isAdmin,
}: {
  courses: CourseOption[];
  faculty: FacultyMember[];
  initialCourseId: string;
  isAdmin: boolean;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string>();
  const [courseId, setCourseId] = useState(initialCourseId);
  const [facultyChoice, setFacultyChoice] = useState("");
  const [title, setTitle] = useState("");
  const [phase, setPhase] = useState<Phase>({ name: "idle" });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string>();
  const formRef = useRef<HTMLFormElement>(null);

  const course = courses.find((c) => c.id === courseId);
  const { teaching, others } = useMemo(() => {
    const ids = new Set(course?.facultyIds ?? []);
    return { teaching: faculty.filter((f) => ids.has(f.id)), others: faculty.filter((f) => !ids.has(f.id)) };
  }, [course, faculty]);
  const coursesByDept = useMemo(() => {
    const groups = new Map<string, CourseOption[]>();
    for (const c of courses) groups.set(c.departmentCode, [...(groups.get(c.departmentCode) ?? []), c]);
    return [...groups.entries()];
  }, [courses]);

  const busy = phase.name === "uploading" || phase.name === "saving";

  function pickFile(f: File | null) {
    setFileError(undefined);
    setFile(null);
    if (!f) return;
    const type = resolveMaterialType(f.name, f.type);
    if (!type) return setFileError("That file type isn't supported. Use PDF, Word, PowerPoint, JPEG, PNG, GIF or WebP.");
    if (f.size === 0) return setFileError("That file is empty.");
    if (f.size > MAX_MATERIAL_BYTES) return setFileError(`That file is ${formatBytes(f.size)}. The limit is 50 MB.`);
    setFile(f);
    if (!title) setTitle(titleFromFileName(f.name));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = new FormData(event.currentTarget);
    setFormError(undefined);
    const meta = {
      courseId: String(form.get("courseId") ?? ""),
      facultyId: facultyChoice && facultyChoice !== OTHER ? facultyChoice : "",
      suggestedFaculty: facultyChoice === OTHER ? String(form.get("suggestedFaculty") ?? "") : "",
      title: String(form.get("title") ?? ""),
      description: String(form.get("description") ?? ""),
    };
    const parsed = materialMetaSchema.safeParse(meta);
    const nextErrors = parsed.success ? {} : fieldErrors(parsed.error);
    if (!file) nextErrors.file = fileError ?? "Choose a file to upload.";
    setErrors(nextErrors);
    if (!parsed.success || !file) return;

    const contentType = resolveMaterialType(file.name, file.type)!;
    setPhase({ name: "uploading" });
    const start = await startUploadAction({ fileName: file.name, contentType, size: file.size });
    if (!start.ok) {
      setPhase({ name: "idle" });
      return setFormError(start.message);
    }
    try {
      await sendFile(start.target, file, contentType);
    } catch (error) {
      void discardUploadAction(start.target.path);
      setPhase({ name: "idle" });
      return setFormError(error instanceof Error ? error.message : "Upload failed.");
    }
    setPhase({ name: "saving" });
    const done = await finishUploadAction({
      ...meta,
      path: start.target.path,
      fileName: file.name,
      contentType,
      size: file.size,
    });
    if (!done.ok) {
      setPhase({ name: "idle" });
      return setFormError(done.message);
    }
    setPhase({ name: "done", id: done.id, status: done.status });
  }

  if (phase.name === "done") {
    return (
      <div className="card p-8 text-center" role="status">
        <CheckCircle2 className="mx-auto size-10 text-success" aria-hidden />
        <h2 className="mt-3 text-xl font-semibold">{phase.status === "approved" ? "Published" : "Uploaded — thank you!"}</h2>
        <p className="mx-auto mt-1 max-w-md text-ink-muted">
          {phase.status === "approved"
            ? "It's live on the course page now."
            : "An admin will review it soon. You can track its status under My uploads."}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <LinkButton href={`/materials/${phase.id}`} variant="secondary">View material</LinkButton>
          <Button
            onClick={() => {
              setFile(null);
              setTitle("");
              setPhase({ name: "idle" });
              formRef.current?.reset();
            }}
          >
            Upload another
          </Button>
        </div>
        <p className="mt-4 text-sm"><Link href="/uploads" className="text-brand hover:underline">Go to My uploads</Link></p>
      </div>
    );
  }

  return (
    <form ref={formRef} onSubmit={submit} className="card space-y-6 p-5 sm:p-6" noValidate>
      {formError && <Alert tone="danger">{formError}</Alert>}

      <Field label="File" htmlFor="file" error={errors.file ?? fileError} hint="PDF, Word, PowerPoint or image · up to 50 MB">
        <label
          htmlFor="file"
          className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border-strong bg-bg px-4 py-8 text-center hover:border-brand/50"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            pickFile(e.dataTransfer.files[0] ?? null);
          }}
        >
          <FileUp className="size-7 text-brand" aria-hidden />
          {file ? (
            <span>
              <span className="block font-medium">{file.name}</span>
              <span className="text-sm text-ink-subtle">
                {MATERIAL_TYPES[resolveMaterialType(file.name, file.type) ?? ""]?.label} · {formatBytes(file.size)} · click to change
              </span>
            </span>
          ) : (
            <span className="text-sm text-ink-muted"><span className="font-medium text-brand">Choose a file</span> or drag it here</span>
          )}
        </label>
        <input
          id="file"
          type="file"
          accept={MATERIAL_ACCEPT}
          className="sr-only"
          aria-describedby={describedBy("file", errors.file ?? fileError, true)}
          onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
          disabled={busy}
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Course" htmlFor="courseId" error={errors.courseId}>
          <Select
            id="courseId"
            name="courseId"
            value={courseId}
            onChange={(e) => {
              setCourseId(e.target.value);
              setFacultyChoice("");
            }}
            invalid={Boolean(errors.courseId)}
            disabled={busy}
          >
            <option value="">Select a course…</option>
            {coursesByDept.map(([dept, list]) => (
              <optgroup key={dept} label={dept}>
                {list.map((c) => <option key={c.id} value={c.id}>{c.code} — {c.title}</option>)}
              </optgroup>
            ))}
          </Select>
        </Field>

        <Field label="Instructor" htmlFor="facultyId" optional error={errors.facultyId}>
          <Select id="facultyId" value={facultyChoice} onChange={(e) => setFacultyChoice(e.target.value)} disabled={busy}>
            <option value="">Not sure / not specific</option>
            {teaching.length > 0 && (
              <optgroup label={`Teaches ${course?.code}`}>
                {teaching.map((f) => <option key={f.id} value={f.id}>{f.name}{f.shortForm ? ` (${f.shortForm})` : ""}</option>)}
              </optgroup>
            )}
            <optgroup label="All instructors">
              {others.map((f) => <option key={f.id} value={f.id}>{f.name}{f.shortForm ? ` (${f.shortForm})` : ""}</option>)}
            </optgroup>
            <option value={OTHER}>Someone not listed…</option>
          </Select>
        </Field>
      </div>

      {facultyChoice === OTHER && (
        <Field
          label="Instructor's name"
          htmlFor="suggestedFaculty"
          error={errors.suggestedFaculty}
          hint={isAdmin ? "Add instructors in Admin › Instructors to make them selectable." : "An admin will add them to the catalog when reviewing your upload."}
        >
          <Input id="suggestedFaculty" name="suggestedFaculty" maxLength={150} placeholder="e.g. Dr. Ayesha Rahman" disabled={busy} />
        </Field>
      )}

      <Field label="Title" htmlFor="title" error={errors.title} hint="What is it? e.g. “Midterm 2024 solutions” or “Week 5 lecture slides”">
        <Input
          id="title"
          name="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={200}
          invalid={Boolean(errors.title)}
          aria-describedby={describedBy("title", errors.title, true)}
          disabled={busy}
        />
      </Field>

      <Field label="Description" htmlFor="description" optional error={errors.description}>
        <Textarea id="description" name="description" maxLength={1000} rows={3} placeholder="Chapters covered, semester, anything that helps others" disabled={busy} />
      </Field>

      <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-ink-subtle">
          Only upload material you&apos;re allowed to share. {isAdmin ? "" : "Uploads are reviewed before publishing."}
        </p>
        <Button type="submit" disabled={busy} size="lg">
          {busy && <Loader2 className="size-4 animate-spin" aria-hidden />}
          {phase.name === "uploading" ? "Uploading file…" : phase.name === "saving" ? "Checking file…" : "Upload"}
        </Button>
      </div>
      <p className="sr-only" aria-live="polite">
        {phase.name === "uploading" ? "Uploading file" : phase.name === "saving" ? "Checking file" : ""}
      </p>
    </form>
  );
}
