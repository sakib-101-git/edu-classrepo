// Domain types shared by pages, server actions and both data backends.

export type Role = "student" | "faculty" | "admin";
export type MaterialStatus = "pending" | "approved" | "rejected";
export type MaterialKind = "pdf" | "document" | "presentation" | "image";

export interface Department {
  id: string;
  code: string;
  name: string;
}

export interface DepartmentWithStats extends Department {
  courseCount: number;
  materialCount: number;
}

export interface FacultyMember {
  id: string;
  name: string;
  shortForm: string | null;
  email: string | null;
  departmentId: string | null;
  departmentCode: string | null;
}

export interface FacultyHit {
  id: string;
  name: string;
  shortForm: string | null;
  departmentCode: string | null;
  courseCount: number;
}

export interface CourseSummary {
  id: string;
  code: string;
  title: string;
  creditHours: number | null;
  department: { code: string; name: string };
  facultyCount: number;
  materialCount: number;
}

export interface CourseDetail {
  id: string;
  code: string;
  title: string;
  creditHours: number | null;
  department: Department;
  faculty: FacultyMember[];
}

export interface CourseOption {
  id: string;
  code: string;
  title: string;
  departmentCode: string;
  facultyIds: string[];
}

export interface Material {
  id: string;
  title: string;
  description: string | null;
  originalFilename: string;
  contentType: string;
  kind: MaterialKind;
  sizeBytes: number;
  status: MaterialStatus;
  rejectionReason: string | null;
  suggestedFaculty: string | null;
  createdAt: string;
  storagePath: string;
  course: { id: string; code: string; title: string };
  faculty: { id: string; name: string; shortForm: string | null } | null;
  uploader: { id: string; name: string } | null;
}

export interface MaterialHit {
  id: string;
  title: string;
  kind: MaterialKind;
  sizeBytes: number;
  createdAt: string;
  courseCode: string;
  courseTitle: string;
  facultyName: string | null;
}

export interface Viewer {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  studentId: string | null;
  departmentId: string | null;
  departmentCode: string | null;
  departmentName: string | null;
  semester: number | null;
  avatarUrl: string | null;
  onboarded: boolean;
}

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AdminStats {
  pendingMaterials: number;
  approvedMaterials: number;
  courses: number;
  faculty: number;
  departments: number;
}

/** Where the browser should send the file bytes for a new material. */
export type UploadTarget =
  | { kind: "supabase"; path: string; token: string }
  | { kind: "demo"; path: string; url: string };
