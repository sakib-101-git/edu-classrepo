import "server-only";

import { cache } from "react";
import { demoMode, supabaseConfigured } from "@/lib/env";
import type {
  AdminStats, CourseDetail, CourseOption, CourseSummary, Department, DepartmentWithStats,
  FacultyHit, FacultyMember, Material, MaterialHit, MaterialKind, MaterialStatus, Paged,
  UploadTarget, Viewer,
} from "@/lib/types";

/** An error whose message is safe to show to the user. */
export class UserError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UserError";
  }
}

export class NotConfiguredError extends Error {
  constructor() {
    super("Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }
}

export interface ProfileInput {
  fullName: string;
  studentId: string | null;
  departmentId: string | null;
  semester: number | null;
}

export interface NewMaterialInput {
  courseId: string;
  facultyId: string | null;
  suggestedFaculty: string | null;
  title: string;
  description: string | null;
  originalFilename: string;
  storagePath: string;
  contentType: string;
  kind: MaterialKind;
  sizeBytes: number;
}

export interface MaterialQuery {
  facultyId?: string;
  kind?: MaterialKind;
  page: number;
  pageSize: number;
}

export interface CourseInput {
  code: string;
  title: string;
  departmentId: string;
  creditHours: number | null;
  facultyIds: string[];
}

export interface FacultyInput {
  name: string;
  shortForm: string | null;
  email: string | null;
  departmentId: string | null;
}

export type Review =
  | { action: "approve"; facultyId: string | null; title: string }
  | { action: "reject"; reason: string | null };

/**
 * Everything the app can ask of its data store. Implemented by Supabase
 * (lib/server/supabase) and by the in-memory demo store (lib/server/demo).
 * Authorization is enforced by the store itself (RLS in Supabase), so callers
 * cannot bypass it by calling a method from the wrong page.
 */
export interface Backend {
  readonly mode: "supabase" | "demo";

  // ── Session ──
  getViewer(): Promise<Viewer | null>;
  /**
   * Sends a 6-digit sign-in code. With `createUser`, an unknown address gets a
   * new, password-less account; the password and profile are set only after
   * the code proves the person owns the inbox.
   */
  requestCode(email: string, opts: { createUser: boolean }): Promise<void>;
  verifyCode(email: string, code: string): Promise<void>;
  signInWithPassword(email: string, password: string): Promise<void>;
  setPassword(password: string): Promise<void>;
  signOut(): Promise<void>;

  // ── Profile ──
  updateProfile(input: ProfileInput & { markOnboarded?: boolean }): Promise<void>;
  setAvatar(file: { bytes: Uint8Array; contentType: string; ext: string } | null): Promise<void>;

  // ── Catalog ──
  listDepartments(): Promise<DepartmentWithStats[]>;
  getDepartment(code: string): Promise<Department | null>;
  searchCourses(q: { query?: string; department?: string; page: number; pageSize: number }): Promise<Paged<CourseSummary>>;
  getCourseByCode(code: string): Promise<CourseDetail | null>;
  listCourseOptions(): Promise<CourseOption[]>;
  listFaculty(): Promise<FacultyMember[]>;
  searchFaculty(query: string): Promise<FacultyHit[]>;
  searchMaterials(query: string): Promise<MaterialHit[]>;

  // ── Materials ──
  listCourseMaterials(courseId: string, q: MaterialQuery): Promise<Paged<Material>>;
  listRecentMaterials(limit: number): Promise<Material[]>;
  listMyUploads(): Promise<Material[]>;
  getMaterial(id: string): Promise<Material | null>;
  /** Short-lived URL for a material the viewer may read. */
  materialFileUrl(material: Material, opts: { download: boolean }): Promise<string>;
  /** First bytes of an uploaded file, to verify its real type. */
  readUploadHead(path: string): Promise<Uint8Array>;
  createUploadTarget(ext: string): Promise<UploadTarget>;
  discardUpload(path: string): Promise<void>;
  createMaterial(input: NewMaterialInput): Promise<{ id: string; status: MaterialStatus }>;
  deleteMaterial(id: string): Promise<void>;

  // ── Enrollment ──
  listMyCourses(): Promise<CourseSummary[]>;
  myCourseIds(): Promise<Set<string>>;
  enroll(courseId: string): Promise<void>;
  unenroll(courseId: string): Promise<void>;

  // ── Admin ──
  adminStats(): Promise<AdminStats>;
  listPendingMaterials(page: number, pageSize: number): Promise<Paged<Material>>;
  reviewMaterial(id: string, review: Review): Promise<void>;
  saveDepartment(id: string | null, input: { code: string; name: string }): Promise<void>;
  deleteDepartment(id: string): Promise<void>;
  saveFaculty(id: string | null, input: FacultyInput): Promise<void>;
  deleteFaculty(id: string): Promise<void>;
  saveCourse(id: string | null, input: CourseInput): Promise<void>;
  deleteCourse(id: string): Promise<void>;
}

/** One backend per request (cached), chosen by configuration. */
export const getBackend = cache(async (): Promise<Backend> => {
  if (supabaseConfigured) {
    const { createSupabaseBackend } = await import("./supabase/backend");
    return createSupabaseBackend();
  }
  if (demoMode) {
    const { createDemoBackend } = await import("./demo/backend");
    return createDemoBackend();
  }
  throw new NotConfiguredError();
});
