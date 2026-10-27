import "server-only";

import { randomInt, randomUUID, scryptSync, timingSafeEqual, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { ALLOWED_EMAIL_DOMAIN } from "@/lib/env";
import type { CourseSummary, FacultyMember, Material, Paged, Viewer } from "@/lib/types";
import { UserError, type Backend } from "../backend";
import { DEMO_ADMIN_ID, DEMO_STUDENT_ID, demoStore, type DemoMaterial, type DemoUser } from "./store";

// Demo mode mirrors the database rules (see supabase/migrations) so the app
// behaves the same way it will against Supabase: approved materials are
// public, uploads start pending, only admins moderate or edit the catalog.

export const DEMO_SESSION_COOKIE = "edu_demo_session";
export const DEMO_MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

function hashPassword(password: string): string {
  const salt = randomBytes(16);
  return `${salt.toString("hex")}:${scryptSync(password, salt, 32).toString("hex")}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const actual = scryptSync(password, Buffer.from(salt, "hex"), 32);
  return timingSafeEqual(actual, Buffer.from(hash, "hex"));
}

const page = <T>(items: T[], p: number, size: number): Paged<T> => ({
  items: items.slice(p * size, p * size + size),
  total: items.length,
  page: p,
  pageSize: size,
});

const contains = (haystack: string | null | undefined, needle: string) =>
  (haystack ?? "").toLowerCase().includes(needle.toLowerCase());

/** Signs in as one of the built-in demo accounts (no password). */
export async function demoSignInAs(role: "student" | "admin"): Promise<void> {
  const token = randomUUID();
  demoStore().sessions.set(token, role === "admin" ? DEMO_ADMIN_ID : DEMO_STUDENT_ID);
  await setSessionCookie(token);
}

async function setSessionCookie(token: string) {
  (await cookies()).set(DEMO_SESSION_COOKIE, token, { httpOnly: true, sameSite: "lax", path: "/" });
}

export async function createDemoBackend(): Promise<Backend> {
  const store = demoStore();
  const jar = await cookies();
  const sessionToken = jar.get(DEMO_SESSION_COOKIE)?.value;
  const sessionUserId = sessionToken ? store.sessions.get(sessionToken) ?? null : null;
  const me = (): DemoUser | null => store.users.find((u) => u.id === sessionUserId) ?? null;
  const isAdmin = () => me()?.role === "admin";

  function requireUser(): DemoUser {
    const user = me();
    if (!user) throw new UserError("Please sign in first.");
    return user;
  }

  function requireAdmin(): DemoUser {
    const user = requireUser();
    if (user.role !== "admin") throw new UserError("You don't have permission to do that.");
    return user;
  }

  function canSee(m: DemoMaterial): boolean {
    return m.status === "approved" || m.uploaderId === sessionUserId || isAdmin();
  }

  function toMaterial(m: DemoMaterial): Material {
    const course = store.courses.find((c) => c.id === m.courseId)!;
    const faculty = store.faculty.find((f) => f.id === m.facultyId);
    const uploader = store.users.find((u) => u.id === m.uploaderId);
    return {
      id: m.id, title: m.title, description: m.description, originalFilename: m.originalFilename,
      contentType: m.contentType, kind: m.kind, sizeBytes: m.sizeBytes, status: m.status,
      rejectionReason: m.rejectionReason, suggestedFaculty: m.suggestedFaculty, createdAt: m.createdAt,
      storagePath: m.storagePath,
      course: { id: course.id, code: course.code, title: course.title },
      faculty: faculty ? { id: faculty.id, name: faculty.name, shortForm: faculty.shortForm } : null,
      uploader: uploader ? { id: uploader.id, name: uploader.fullName || "EDU student" } : null,
    };
  }

  function toFaculty(f: (typeof store.faculty)[number]): FacultyMember {
    return { ...f, departmentCode: store.departments.find((d) => d.id === f.departmentId)?.code ?? null };
  }

  function toCourseSummary(c: (typeof store.courses)[number]): CourseSummary {
    const dept = store.departments.find((d) => d.id === c.departmentId)!;
    return {
      id: c.id, code: c.code, title: c.title, creditHours: c.creditHours,
      department: { code: dept.code, name: dept.name },
      facultyCount: c.facultyIds.length,
      materialCount: store.materials.filter((m) => m.courseId === c.id && m.status === "approved").length,
    };
  }

  function assertUnique(exists: boolean, what: string) {
    if (exists) throw new UserError(`${what}: that already exists.`);
  }

  const backend: Backend = {
    mode: "demo",

    async getViewer(): Promise<Viewer | null> {
      const u = me();
      if (!u) return null;
      const dept = store.departments.find((d) => d.id === u.departmentId);
      return {
        id: u.id, email: u.email, fullName: u.fullName, role: u.role, studentId: u.studentId,
        departmentId: u.departmentId, departmentCode: dept?.code ?? null, departmentName: dept?.name ?? null,
        semester: u.semester, avatarUrl: u.avatarPath ? `/api/demo/file?avatar=${encodeURIComponent(u.avatarPath)}` : null,
        onboarded: u.onboarded,
      };
    },

    async requestCode(email, { createUser }) {
      if (!email.endsWith(`@${ALLOWED_EMAIL_DOMAIN}`)) throw new UserError("Use your university email.");
      const exists = store.users.some((u) => u.email === email);
      if (!exists && !createUser) return; // don't reveal whether the account exists
      if (!exists) {
        store.users.push({
          id: randomUUID(), email, passwordHash: null, fullName: "", role: "student",
          studentId: null, departmentId: null, semester: null, avatarPath: null, onboarded: false,
        });
      }
      const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
      store.codes.set(email, { code, expires: Date.now() + 10 * 60_000, attempts: 0 });
    },

    async verifyCode(email, code) {
      const entry = store.codes.get(email);
      const user = store.users.find((u) => u.email === email);
      if (!entry || !user || entry.expires < Date.now() || entry.attempts >= 5) {
        throw new UserError("That code is invalid or has expired.");
      }
      if (entry.code !== code) {
        entry.attempts += 1;
        throw new UserError("That code is invalid or has expired.");
      }
      store.codes.delete(email);
      const token = randomUUID();
      store.sessions.set(token, user.id);
      await setSessionCookie(token);
    },

    async signInWithPassword(email, password) {
      const user = store.users.find((u) => u.email === email);
      if (!user?.passwordHash || !verifyPassword(password, user.passwordHash)) {
        throw new UserError("Incorrect email or password.");
      }
      const token = randomUUID();
      store.sessions.set(token, user.id);
      await setSessionCookie(token);
    },

    async setPassword(password) {
      requireUser().passwordHash = hashPassword(password);
    },

    async signOut() {
      if (sessionToken) store.sessions.delete(sessionToken);
      jar.delete(DEMO_SESSION_COOKIE);
    },

    async updateProfile(input) {
      const u = requireUser();
      if (input.departmentId && !store.departments.some((d) => d.id === input.departmentId)) {
        throw new UserError("Saving your profile: some values are invalid.");
      }
      Object.assign(u, {
        fullName: input.fullName, studentId: input.studentId,
        departmentId: input.departmentId, semester: input.semester,
      });
      if (input.markOnboarded) u.onboarded = true;
    },

    async setAvatar(file) {
      const u = requireUser();
      if (u.avatarPath) store.files.delete(u.avatarPath);
      u.avatarPath = null;
      if (file) {
        const path = `${u.id}/${randomUUID()}.${file.ext}`;
        store.files.set(path, { bytes: file.bytes, contentType: file.contentType, ownerId: u.id });
        u.avatarPath = path;
      }
    },

    async listDepartments() {
      return [...store.departments].sort((a, b) => a.code.localeCompare(b.code)).map((d) => {
        const courseIds = store.courses.filter((c) => c.departmentId === d.id).map((c) => c.id);
        return {
          ...d,
          courseCount: courseIds.length,
          materialCount: store.materials.filter((m) => courseIds.includes(m.courseId) && m.status === "approved").length,
        };
      });
    },

    async getDepartment(code) {
      return store.departments.find((d) => d.code === code.toUpperCase()) ?? null;
    },

    async searchCourses({ query, department, page: p, pageSize }) {
      const q = (query ?? "").trim();
      const compact = q.replace(/\s+/g, "").toLowerCase();
      const items = store.courses
        .filter((c) => {
          const dept = store.departments.find((d) => d.id === c.departmentId)!;
          if (department && dept.code !== department.toUpperCase()) return false;
          if (!q) return true;
          return (
            contains(c.code, q) || c.code.replace(/\s+/g, "").toLowerCase().includes(compact) ||
            contains(c.title, q) || contains(dept.name, q) ||
            c.facultyIds.some((fid) => {
              const f = store.faculty.find((x) => x.id === fid);
              return contains(f?.name, q) || contains(f?.shortForm, q);
            })
          );
        })
        .sort((a, b) => a.code.localeCompare(b.code))
        .map(toCourseSummary);
      return page(items, p, pageSize);
    },

    async getCourseByCode(code) {
      const c = store.courses.find((x) => x.code === code);
      if (!c) return null;
      return {
        id: c.id, code: c.code, title: c.title, creditHours: c.creditHours,
        department: store.departments.find((d) => d.id === c.departmentId)!,
        faculty: store.faculty.filter((f) => c.facultyIds.includes(f.id)).map(toFaculty)
          .sort((a, b) => a.name.localeCompare(b.name)),
      };
    },

    async listCourseOptions() {
      return [...store.courses].sort((a, b) => a.code.localeCompare(b.code)).map((c) => ({
        id: c.id, code: c.code, title: c.title,
        departmentCode: store.departments.find((d) => d.id === c.departmentId)!.code,
        facultyIds: [...c.facultyIds],
      }));
    },

    async listFaculty() {
      return [...store.faculty].sort((a, b) => a.name.localeCompare(b.name)).map(toFaculty);
    },

    async searchFaculty(query) {
      if (!query.trim()) return [];
      return store.faculty
        .filter((f) => contains(f.name, query) || contains(f.shortForm, query))
        .slice(0, 12)
        .map((f) => ({
          id: f.id, name: f.name, shortForm: f.shortForm,
          departmentCode: store.departments.find((d) => d.id === f.departmentId)?.code ?? null,
          courseCount: store.courses.filter((c) => c.facultyIds.includes(f.id)).length,
        }));
    },

    async searchMaterials(query) {
      if (!query.trim()) return [];
      return store.materials
        .filter((m) => m.status === "approved" && (contains(m.title, query) || contains(m.originalFilename, query)))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 12)
        .map((m) => {
          const full = toMaterial(m);
          return {
            id: m.id, title: m.title, kind: m.kind, sizeBytes: m.sizeBytes, createdAt: m.createdAt,
            courseCode: full.course.code, courseTitle: full.course.title, facultyName: full.faculty?.name ?? null,
          };
        });
    },

    async listCourseMaterials(courseId, { facultyId, kind, page: p, pageSize }) {
      const items = store.materials
        .filter((m) =>
          m.courseId === courseId &&
          (m.status === "approved" || (m.status === "pending" && m.uploaderId === sessionUserId)) &&
          (!facultyId || m.facultyId === facultyId) &&
          (!kind || m.kind === kind))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map(toMaterial);
      return page(items, p, pageSize);
    },

    async listRecentMaterials(limit) {
      return store.materials
        .filter((m) => m.status === "approved")
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, limit)
        .map(toMaterial);
    },

    async listMyUploads() {
      const u = requireUser();
      return store.materials
        .filter((m) => m.uploaderId === u.id)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map(toMaterial);
    },

    async getMaterial(id) {
      const m = store.materials.find((x) => x.id === id);
      return m && canSee(m) ? toMaterial(m) : null;
    },

    async materialFileUrl(material, { download }) {
      const m = store.materials.find((x) => x.id === material.id);
      if (!m || !canSee(m) || !store.files.has(m.storagePath)) throw new UserError("This file is not available.");
      return `/api/demo/file?material=${m.id}${download ? "&download=1" : ""}`;
    },

    async readUploadHead(path) {
      const file = store.files.get(path);
      if (!file || file.ownerId !== sessionUserId) {
        throw new UserError("The uploaded file could not be found. Please upload it again.");
      }
      return file.bytes.slice(0, 16);
    },

    async createUploadTarget(ext) {
      const u = requireUser();
      const path = `uploads/${u.id}/${randomUUID()}.${ext}`;
      const token = randomUUID();
      store.uploadTokens.set(token, { path, userId: u.id, expires: Date.now() + 2 * 3_600_000 });
      return { kind: "demo", path, url: `/api/demo/upload?token=${token}` };
    },

    async discardUpload(path) {
      const file = store.files.get(path);
      if (file && (file.ownerId === sessionUserId || isAdmin())) store.files.delete(path);
    },

    async createMaterial(input) {
      const u = requireUser();
      const file = store.files.get(input.storagePath);
      if (
        !input.storagePath.startsWith(`uploads/${u.id}/`) || !file || file.ownerId !== u.id ||
        file.bytes.length !== input.sizeBytes || file.contentType !== input.contentType
      ) {
        throw new UserError("The upload could not be verified. Please try again.");
      }
      if (!store.courses.some((c) => c.id === input.courseId)) throw new UserError("Pick a course.");
      if (input.facultyId && !store.faculty.some((f) => f.id === input.facultyId)) throw new UserError("Pick an instructor.");
      const status = u.role === "admin" ? "approved" : "pending";
      const id = randomUUID();
      store.materials.push({
        id, courseId: input.courseId, facultyId: input.facultyId, uploaderId: u.id,
        title: input.title, description: input.description, suggestedFaculty: input.suggestedFaculty,
        originalFilename: input.originalFilename, storagePath: input.storagePath,
        contentType: input.contentType, kind: input.kind, sizeBytes: input.sizeBytes, status,
        rejectionReason: null, reviewedBy: status === "approved" ? u.id : null,
        createdAt: new Date().toISOString(),
      });
      return { id, status };
    },

    async deleteMaterial(id) {
      const u = requireUser();
      const index = store.materials.findIndex((m) => m.id === id && (m.uploaderId === u.id || u.role === "admin"));
      if (index < 0) throw new UserError("That material doesn't exist or you can't delete it.");
      const [removed] = store.materials.splice(index, 1);
      if (removed) store.files.delete(removed.storagePath);
    },

    async listMyCourses() {
      if (!sessionUserId) return [];
      const ids = store.enrollments.filter((e) => e.userId === sessionUserId).map((e) => e.courseId);
      return store.courses.filter((c) => ids.includes(c.id)).sort((a, b) => a.code.localeCompare(b.code)).map(toCourseSummary);
    },

    async myCourseIds() {
      return new Set(store.enrollments.filter((e) => e.userId === sessionUserId).map((e) => e.courseId));
    },

    async enroll(courseId) {
      const u = requireUser();
      if (!store.courses.some((c) => c.id === courseId)) throw new UserError("That course doesn't exist.");
      if (!store.enrollments.some((e) => e.userId === u.id && e.courseId === courseId)) {
        store.enrollments.push({ userId: u.id, courseId });
      }
    },

    async unenroll(courseId) {
      const u = requireUser();
      store.enrollments = store.enrollments.filter((e) => !(e.userId === u.id && e.courseId === courseId));
    },

    async adminStats() {
      requireAdmin();
      return {
        pendingMaterials: store.materials.filter((m) => m.status === "pending").length,
        approvedMaterials: store.materials.filter((m) => m.status === "approved").length,
        courses: store.courses.length,
        faculty: store.faculty.length,
        departments: store.departments.length,
      };
    },

    async listPendingMaterials(p, pageSize) {
      requireAdmin();
      const items = store.materials
        .filter((m) => m.status === "pending")
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
        .map(toMaterial);
      return page(items, p, pageSize);
    },

    async reviewMaterial(id, review) {
      const admin = requireAdmin();
      const m = store.materials.find((x) => x.id === id);
      if (!m) throw new UserError("That material no longer exists, or you can't moderate it.");
      m.reviewedBy = admin.id;
      if (review.action === "approve") {
        if (review.facultyId && !store.faculty.some((f) => f.id === review.facultyId)) throw new UserError("Pick an instructor.");
        Object.assign(m, { status: "approved", facultyId: review.facultyId, title: review.title, rejectionReason: null });
      } else {
        Object.assign(m, { status: "rejected", rejectionReason: review.reason });
        store.files.delete(m.storagePath);
      }
    },

    async saveDepartment(id, input) {
      requireAdmin();
      assertUnique(store.departments.some((d) => d.code === input.code && d.id !== id), "Saving the department");
      if (id) Object.assign(store.departments.find((d) => d.id === id) ?? {}, input);
      else store.departments.push({ id: randomUUID(), ...input });
    },

    async deleteDepartment(id) {
      requireAdmin();
      if (store.courses.some((c) => c.departmentId === id)) {
        throw new UserError("Deleting the department: it is still in use by other records.");
      }
      store.departments = store.departments.filter((d) => d.id !== id);
      store.faculty.forEach((f) => { if (f.departmentId === id) f.departmentId = null; });
    },

    async saveFaculty(id, input) {
      requireAdmin();
      assertUnique(
        Boolean(input.shortForm) && store.faculty.some((f) => f.shortForm === input.shortForm && f.id !== id),
        "Saving the instructor",
      );
      if (id) Object.assign(store.faculty.find((f) => f.id === id) ?? {}, input);
      else store.faculty.push({ id: randomUUID(), ...input });
    },

    async deleteFaculty(id) {
      requireAdmin();
      store.faculty = store.faculty.filter((f) => f.id !== id);
      store.courses.forEach((c) => { c.facultyIds = c.facultyIds.filter((f) => f !== id); });
      store.materials.forEach((m) => { if (m.facultyId === id) m.facultyId = null; });
    },

    async saveCourse(id, input) {
      requireAdmin();
      assertUnique(store.courses.some((c) => c.code === input.code && c.id !== id), "Saving the course");
      if (!store.departments.some((d) => d.id === input.departmentId)) throw new UserError("Pick a department.");
      const facultyIds = input.facultyIds.filter((f) => store.faculty.some((x) => x.id === f));
      const fields = {
        code: input.code, title: input.title, departmentId: input.departmentId,
        creditHours: input.creditHours, facultyIds,
      };
      if (id) Object.assign(store.courses.find((c) => c.id === id) ?? {}, fields);
      else store.courses.push({ id: randomUUID(), ...fields });
    },

    async deleteCourse(id) {
      requireAdmin();
      if (store.materials.some((m) => m.courseId === id)) {
        throw new UserError("This course still has materials. Delete or move them before removing the course.");
      }
      store.courses = store.courses.filter((c) => c.id !== id);
      store.enrollments = store.enrollments.filter((e) => e.courseId !== id);
    },
  };

  return backend;
}
