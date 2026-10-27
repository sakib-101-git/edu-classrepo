import "server-only";

import catalog from "@/supabase/sample-catalog.json";
import type { MaterialKind, MaterialStatus, Role } from "@/lib/types";
import { makeSamplePdf } from "./pdf";

// In-memory data for demo mode. It lives on globalThis so it survives dev
// server hot reloads, and it resets whenever the server restarts.

export interface DemoUser {
  id: string;
  email: string;
  passwordHash: string | null;
  fullName: string;
  role: Role;
  studentId: string | null;
  departmentId: string | null;
  semester: number | null;
  avatarPath: string | null;
  onboarded: boolean;
}

export interface DemoCourse {
  id: string;
  code: string;
  title: string;
  departmentId: string;
  creditHours: number | null;
  facultyIds: string[];
}

export interface DemoFaculty {
  id: string;
  name: string;
  shortForm: string | null;
  email: string | null;
  departmentId: string | null;
}

export interface DemoMaterial {
  id: string;
  courseId: string;
  facultyId: string | null;
  uploaderId: string | null;
  title: string;
  description: string | null;
  suggestedFaculty: string | null;
  originalFilename: string;
  storagePath: string;
  contentType: string;
  kind: MaterialKind;
  sizeBytes: number;
  status: MaterialStatus;
  rejectionReason: string | null;
  reviewedBy: string | null;
  createdAt: string;
}

export interface DemoFile {
  bytes: Uint8Array;
  contentType: string;
  ownerId: string;
}

export interface DemoStore {
  departments: { id: string; code: string; name: string }[];
  faculty: DemoFaculty[];
  courses: DemoCourse[];
  materials: DemoMaterial[];
  enrollments: { userId: string; courseId: string }[];
  users: DemoUser[];
  sessions: Map<string, string>;
  codes: Map<string, { code: string; expires: number; attempts: number }>;
  files: Map<string, DemoFile>;
  uploadTokens: Map<string, { path: string; userId: string; expires: number }>;
}

export const DEMO_STUDENT_ID = "00000000-0000-4000-8000-000000000001";
export const DEMO_ADMIN_ID = "00000000-0000-4000-8000-000000000002";

function seed(): DemoStore {
  const id = () => crypto.randomUUID();
  const departments = catalog.departments.map((d) => ({ id: id(), code: d.code, name: d.name }));
  const deptId = (code: string) => departments.find((d) => d.code === code)?.id ?? null;

  const faculty: DemoFaculty[] = catalog.faculty.map((f) => ({
    id: id(), name: f.name, shortForm: f.shortForm, email: null, departmentId: deptId(f.department),
  }));
  const facultyId = (sf: string) => faculty.find((f) => f.shortForm === sf)?.id;

  const courses: DemoCourse[] = catalog.courses.map((c) => ({
    id: id(),
    code: c.code,
    title: c.title,
    departmentId: deptId(c.department) ?? departments[0]!.id,
    creditHours: c.creditHours,
    facultyIds: c.faculty.map(facultyId).filter((x): x is string => Boolean(x)),
  }));

  const users: DemoUser[] = [
    {
      id: DEMO_STUDENT_ID, email: "demo.student@eastdelta.edu.bd", passwordHash: null,
      fullName: "Demo Student", role: "student", studentId: "DEMO-001",
      departmentId: deptId("CSE"), semester: 4, avatarPath: null, onboarded: true,
    },
    {
      id: DEMO_ADMIN_ID, email: "demo.admin@eastdelta.edu.bd", passwordHash: null,
      fullName: "Demo Admin", role: "admin", studentId: null,
      departmentId: deptId("CSE"), semester: null, avatarPath: null, onboarded: true,
    },
  ];

  const files = new Map<string, DemoFile>();
  const materials: DemoMaterial[] = [];
  const day = 86_400_000;
  const samples: [string, string, string, MaterialStatus, string][] = [
    ["CSE 111", "SMP1", "Lecture 1 - Introduction to C", "approved", DEMO_ADMIN_ID],
    ["CSE 111", "SMP3", "Pointers and arrays - class notes", "approved", DEMO_STUDENT_ID],
    ["CSE 111", "SMP1", "Midterm practice questions", "approved", DEMO_ADMIN_ID],
    ["CSE 211", "SMP2", "Linked lists cheat sheet", "approved", DEMO_STUDENT_ID],
    ["CSE 211", "SMP1", "Stacks and queues slides (summary)", "approved", DEMO_ADMIN_ID],
    ["CSE 231", "SMP1", "Sorting algorithms comparison", "approved", DEMO_ADMIN_ID],
    ["BBA 201", "SMP7", "Journal entries worked examples", "approved", DEMO_ADMIN_ID],
    ["CSE 311", "SMP2", "Normalization notes (awaiting review)", "pending", DEMO_STUDENT_ID],
  ];
  samples.forEach(([code, sf, title, status, uploader], i) => {
    const course = courses.find((c) => c.code === code)!;
    const path = `uploads/${uploader}/${id()}.pdf`;
    const bytes = makeSamplePdf(title, [
      `Course: ${course.code} - ${course.title}`,
      "This is sample content generated for demo mode.",
      "Real materials are uploaded by students and reviewed by admins.",
    ]);
    files.set(path, { bytes, contentType: "application/pdf", ownerId: uploader });
    materials.push({
      id: id(), courseId: course.id, facultyId: facultyId(sf) ?? null, uploaderId: uploader,
      title, description: status === "pending" ? "Uploaded by the demo student; sign in as admin to review it." : null,
      suggestedFaculty: null,
      originalFilename: `${title.replace(/[^A-Za-z0-9]+/g, "_")}.pdf`, storagePath: path,
      contentType: "application/pdf", kind: "pdf", sizeBytes: bytes.length, status,
      rejectionReason: null, reviewedBy: status === "approved" ? DEMO_ADMIN_ID : null,
      createdAt: new Date(Date.now() - (samples.length - i) * day).toISOString(),
    });
  });

  return {
    departments, faculty, courses, materials, users, files,
    enrollments: ["CSE 111", "CSE 211"].map((code) => ({
      userId: DEMO_STUDENT_ID, courseId: courses.find((c) => c.code === code)!.id,
    })),
    sessions: new Map(),
    codes: new Map(),
    uploadTokens: new Map(),
  };
}

const g = globalThis as unknown as { __eduDemoStore?: DemoStore };

export function demoStore(): DemoStore {
  g.__eduDemoStore ??= seed();
  return g.__eduDemoStore;
}

/** The code most recently sent to this address (demo mode shows it on screen). */
export function peekDemoCode(email: string): string | null {
  const entry = demoStore().codes.get(email.toLowerCase());
  return entry && entry.expires > Date.now() ? entry.code : null;
}
