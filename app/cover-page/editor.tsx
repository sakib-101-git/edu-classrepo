"use client";

/* eslint-disable @next/next/no-img-element -- the logo is inlined as a data URL for the PDF renderer */
import { useEffect, useRef, useState, type CSSProperties, type Ref } from "react";
import { Download, FileImage, Loader2, Printer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { cn } from "@/lib/cn";

type Template = "lab-report" | "assignment";

interface Details {
  template: Template;
  labTitle: string;
  experimentNo: string;
  assignmentTitle: string;
  assignmentTopic: string;
  courseName: string;
  courseCode: string;
  department: string;
  facultyName: string;
  facultyDesignation: string;
  studentName: string;
  studentId: string;
  section: string;
  semester: string;
  submissionDate: string;
}

const ASSIGNMENT_TITLES = ["Assignment", ...Array.from({ length: 6 }, (_, i) => `Assignment ${i + 1}`), "Term Paper", "Project Report"];
const DESIGNATIONS = ["Lecturer", "Senior Lecturer", "Assistant Professor", "Associate Professor", "Professor", "Head of Department"];

// A4 at 96 dpi.
const PAGE_W = 794;
const PAGE_H = 1123;

const blank = (value: string, filler: string) => value.trim() || filler;

/**
 * The printable sheet. Inline styles only: html2canvas cannot parse the
 * oklch colours Tailwind emits, so the sheet must not depend on stylesheets.
 */
function CoverSheet({ d, logo, ref }: { d: Details; logo: string; ref: Ref<HTMLDivElement> }) {
  const dept = d.department.trim() || "Computer Science & Engineering";
  const center: CSSProperties = { textAlign: "center", margin: 0 };
  const heading: CSSProperties = { fontWeight: "bold", fontSize: 15, margin: "0 0 10px", paddingBottom: 5, borderBottom: "1px solid #bbb" };
  return (
    <div
      ref={ref}
      style={{
        width: PAGE_W, height: PAGE_H, background: "#fff", color: "#000", boxSizing: "border-box",
        padding: "56px 80px 48px", display: "flex", flexDirection: "column", alignItems: "center",
        fontFamily: '"Times New Roman", Times, serif', fontSize: 14, lineHeight: 1.5,
      }}
    >
      <img src={logo} alt="East Delta University" width={130} height={130} style={{ objectFit: "contain", marginBottom: 14 }} />
      <p style={{ ...center, fontWeight: "bold", fontSize: 21, marginBottom: 4, fontFamily: "Cambria, Georgia, serif" }}>East Delta University</p>
      <p style={{ ...center, marginBottom: 3 }}>Department of {dept}</p>
      <p style={{ ...center, fontSize: 12, color: "#333", marginBottom: 22 }}>Chittagong, Bangladesh</p>
      <hr style={{ width: "100%", border: 0, borderTop: "2px solid #000", margin: "0 0 26px" }} />

      <p style={{ ...center, fontWeight: "bold", fontSize: 28, marginBottom: 10, fontFamily: "Cambria, Georgia, serif" }}>
        {d.template === "lab-report" ? "Lab Report" : blank(d.assignmentTitle, "Assignment")}
      </p>
      <p style={{ ...center, marginBottom: 8 }}>On</p>
      <p style={{ ...center, fontWeight: "bold", fontSize: 17, marginBottom: 6, maxWidth: 560 }}>
        {d.template === "lab-report" ? blank(d.labTitle, "______________________________") : blank(d.assignmentTopic, "______________________________")}
      </p>
      {d.template === "lab-report" && d.experimentNo.trim() && (
        <p style={{ ...center, fontSize: 13 }}>Experiment No: {d.experimentNo}</p>
      )}
      <div style={{ margin: "18px 0", width: "55%", borderTop: "1px dashed #555" }} />

      <table style={{ width: "100%", fontSize: 14, marginBottom: 20, borderCollapse: "collapse" }}>
        <tbody>
          <tr>
            <td style={{ width: 145, paddingBottom: 6, fontWeight: "bold", verticalAlign: "top" }}>Course Name</td>
            <td style={{ paddingBottom: 6 }}>: {blank(d.courseName, "______________________________")}</td>
          </tr>
          <tr>
            <td style={{ paddingBottom: 6, fontWeight: "bold" }}>Course Code</td>
            <td style={{ paddingBottom: 6 }}>: {blank(d.courseCode, "____________")}</td>
          </tr>
        </tbody>
      </table>
      <hr style={{ width: "100%", border: 0, borderTop: "1px solid #888", margin: "0 0 22px" }} />

      <div style={{ width: "100%", display: "flex", gap: 48, marginBottom: 28 }}>
        <div style={{ flex: 1 }}>
          <p style={heading}>Submitted To</p>
          <p style={{ margin: "0 0 4px", fontWeight: "bold" }}>{blank(d.facultyName, "_______________________")}</p>
          <p style={{ margin: "0 0 4px" }}>{d.facultyDesignation}</p>
          <p style={{ margin: "0 0 4px" }}>Department of {dept}</p>
          <p style={{ margin: 0 }}>East Delta University</p>
        </div>
        <div style={{ flex: 1 }}>
          <p style={heading}>Submitted By</p>
          <p style={{ margin: "0 0 4px", fontWeight: "bold" }}>{blank(d.studentName, "_______________________")}</p>
          <p style={{ margin: "0 0 4px" }}>ID: {blank(d.studentId, "__________")}</p>
          <p style={{ margin: "0 0 4px" }}>Section: {blank(d.section, "___")}</p>
          <p style={{ margin: 0 }}>Semester: {blank(d.semester, "___")}</p>
        </div>
      </div>
      <hr style={{ width: "100%", border: 0, borderTop: "2px solid #000", margin: "0 0 20px" }} />
      <p style={{ ...center }}>
        <strong>Date of Submission:</strong> {blank(d.submissionDate, "___/___/______")}
      </p>
    </div>
  );
}

function useDataUrl(src: string): string {
  const [url, setUrl] = useState(src);
  useEffect(() => {
    let alive = true;
    fetch(src)
      .then((r) => r.blob())
      .then((b) => new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.readAsDataURL(b);
      }))
      .then((u) => alive && setUrl(u))
      .catch(() => undefined);
    return () => { alive = false; };
  }, [src]);
  return url;
}

function fileBase(d: Details): string {
  const parts = [d.courseCode, d.template === "lab-report" ? `Lab_Report${d.experimentNo ? `_${d.experimentNo}` : ""}` : d.assignmentTitle, "Cover"];
  return parts.filter(Boolean).join("_").replace(/[^A-Za-z0-9_-]+/g, "_");
}

export function CoverPageEditor({
  courses,
  facultyNames,
  defaults,
}: {
  courses: { code: string; title: string; department: string }[];
  facultyNames: string[];
  defaults: { studentName: string; studentId: string; department: string; semester: string };
}) {
  const [d, setD] = useState<Details>(() => ({
    template: "lab-report",
    labTitle: "",
    experimentNo: "",
    assignmentTitle: "Assignment",
    assignmentTopic: "",
    courseName: "",
    courseCode: "",
    department: defaults.department,
    facultyName: "",
    facultyDesignation: "Lecturer",
    studentName: defaults.studentName,
    studentId: defaults.studentId,
    section: "",
    semester: defaults.semester,
    submissionDate: new Date().toLocaleDateString("en-GB"),
  }));
  const set = <K extends keyof Details>(key: K) => (e: { target: { value: string } }) =>
    setD((prev) => ({ ...prev, [key]: e.target.value }));

  const logo = useDataUrl("/edu-logo.jpg");
  const sheet = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.6);
  const [busy, setBusy] = useState<"pdf" | "png" | null>(null);

  useEffect(() => {
    const el = frame.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setScale(Math.min(1, entry.contentRect.width / PAGE_W));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  async function render(): Promise<HTMLCanvasElement> {
    const html2canvas = (await import("html2canvas")).default;
    return html2canvas(sheet.current!, {
      scale: 2,
      width: PAGE_W,
      height: PAGE_H,
      backgroundColor: "#ffffff",
      logging: false,
      onclone: (doc) => {
        doc.querySelectorAll('style, link[rel="stylesheet"]').forEach((el) => el.remove());
        doc.querySelectorAll<HTMLElement>("[data-cover-scale]").forEach((el) => { el.style.transform = "none"; });
      },
    });
  }

  async function download(kind: "pdf" | "png") {
    if (!sheet.current) return;
    setBusy(kind);
    try {
      const canvas = await render();
      const name = fileBase(d);
      if (kind === "png") {
        const a = document.createElement("a");
        a.download = `${name}.png`;
        a.href = canvas.toDataURL("image/png");
        a.click();
      } else {
        const { jsPDF } = await import("jspdf");
        const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
        pdf.addImage(canvas.toDataURL("image/jpeg", 0.95), "JPEG", 0, 0, 210, 297);
        pdf.save(`${name}.pdf`);
      }
      toast.success(kind === "pdf" ? "PDF downloaded" : "Image downloaded");
    } catch (error) {
      console.error(error);
      toast.error("Couldn't create the file. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  function print() {
    if (!sheet.current) return;
    const w = window.open("", "_blank", "width=900,height=1100");
    if (!w) return toast.error("Allow pop-ups to print, or download the PDF instead.");
    w.document.write(
      `<!doctype html><title>${fileBase(d)}</title><style>@page{size:A4;margin:0}html,body{margin:0}</style>${sheet.current.outerHTML}`,
    );
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 250);
  }

  const card = "card space-y-4 p-5";
  const legend = "mb-1 font-sans text-sm font-semibold text-ink";

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]">
      <form className="space-y-4" onSubmit={(e) => e.preventDefault()} aria-label="Cover page details">
        <fieldset className={card}>
          <legend className="sr-only">Template</legend>
          <div className="grid grid-cols-2 gap-1 rounded-lg bg-surface-muted p-1" role="radiogroup" aria-label="Template">
            {(["lab-report", "assignment"] as const).map((t) => (
              <button
                key={t}
                type="button"
                role="radio"
                aria-checked={d.template === t}
                onClick={() => setD((p) => ({ ...p, template: t }))}
                className={cn("rounded-md py-2 text-sm font-medium", d.template === t ? "bg-surface text-ink shadow-sm" : "text-ink-muted hover:text-ink")}
              >
                {t === "lab-report" ? "Lab report" : "Assignment"}
              </button>
            ))}
          </div>
          {d.template === "lab-report" ? (
            <>
              <Field label="Experiment title" htmlFor="labTitle"><Input id="labTitle" value={d.labTitle} onChange={set("labTitle")} placeholder="e.g. Implementation of a binary search tree" /></Field>
              <Field label="Experiment no." htmlFor="experimentNo" optional><Input id="experimentNo" value={d.experimentNo} onChange={set("experimentNo")} placeholder="e.g. 3" /></Field>
            </>
          ) : (
            <>
              <Field label="Title" htmlFor="assignmentTitle">
                <Select id="assignmentTitle" value={d.assignmentTitle} onChange={set("assignmentTitle")}>
                  {ASSIGNMENT_TITLES.map((t) => <option key={t}>{t}</option>)}
                </Select>
              </Field>
              <Field label="Topic" htmlFor="assignmentTopic"><Input id="assignmentTopic" value={d.assignmentTopic} onChange={set("assignmentTopic")} placeholder="e.g. Dynamic memory allocation" /></Field>
            </>
          )}
        </fieldset>

        <fieldset className={card}>
          <legend className={legend}>Course</legend>
          {courses.length > 0 && (
            <Field label="Fill from catalog" htmlFor="pickCourse" optional>
              <Select
                id="pickCourse"
                value=""
                onChange={(e) => {
                  const c = courses.find((x) => x.code === e.target.value);
                  if (c) setD((p) => ({ ...p, courseCode: c.code, courseName: c.title, department: c.department || p.department }));
                }}
              >
                <option value="">Choose a course…</option>
                {courses.map((c) => <option key={c.code} value={c.code}>{c.code} — {c.title}</option>)}
              </Select>
            </Field>
          )}
          <Field label="Course name" htmlFor="courseName"><Input id="courseName" value={d.courseName} onChange={set("courseName")} /></Field>
          <Field label="Course code" htmlFor="courseCode"><Input id="courseCode" value={d.courseCode} onChange={set("courseCode")} placeholder="e.g. CSE 211" /></Field>
          <Field label="Department" htmlFor="department"><Input id="department" value={d.department} onChange={set("department")} placeholder="Computer Science & Engineering" /></Field>
        </fieldset>

        <fieldset className={card}>
          <legend className={legend}>Submitted to</legend>
          <Field label="Instructor" htmlFor="facultyName">
            <Input id="facultyName" value={d.facultyName} onChange={set("facultyName")} list="faculty-names" />
            <datalist id="faculty-names">{facultyNames.map((n) => <option key={n} value={n} />)}</datalist>
          </Field>
          <Field label="Designation" htmlFor="facultyDesignation">
            <Select id="facultyDesignation" value={d.facultyDesignation} onChange={set("facultyDesignation")}>
              {DESIGNATIONS.map((t) => <option key={t}>{t}</option>)}
            </Select>
          </Field>
        </fieldset>

        <fieldset className={card}>
          <legend className={legend}>Submitted by</legend>
          <Field label="Your name" htmlFor="studentName"><Input id="studentName" value={d.studentName} onChange={set("studentName")} autoComplete="name" /></Field>
          <Field label="Student ID" htmlFor="studentId"><Input id="studentId" value={d.studentId} onChange={set("studentId")} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Section" htmlFor="section"><Input id="section" value={d.section} onChange={set("section")} placeholder="e.g. A" /></Field>
            <Field label="Semester" htmlFor="semester"><Input id="semester" value={d.semester} onChange={set("semester")} placeholder="e.g. 4th" /></Field>
          </div>
          <Field label="Date of submission" htmlFor="submissionDate"><Input id="submissionDate" value={d.submissionDate} onChange={set("submissionDate")} /></Field>
        </fieldset>
      </form>

      <section aria-label="Preview" className="lg:sticky lg:top-24">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-ink-muted">Live preview (A4)</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={print}><Printer className="size-4" aria-hidden /> Print</Button>
            <Button variant="secondary" size="sm" onClick={() => download("png")} disabled={busy !== null}>
              {busy === "png" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <FileImage className="size-4" aria-hidden />} PNG
            </Button>
            <Button size="sm" onClick={() => download("pdf")} disabled={busy !== null}>
              {busy === "pdf" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Download className="size-4" aria-hidden />} Download PDF
            </Button>
          </div>
        </div>
        <div ref={frame} className="rounded-xl border border-border bg-surface-muted p-3 sm:p-5">
          <div className="mx-auto overflow-hidden shadow-[var(--shadow-pop)]" style={{ width: PAGE_W * scale, height: PAGE_H * scale }}>
            <div data-cover-scale style={{ transform: `scale(${scale})`, transformOrigin: "top left", width: PAGE_W }}>
              <CoverSheet d={d} logo={logo} ref={sheet} />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
