import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import type {
  CourseSummary, FacultyMember, Material, MaterialStatus, Viewer,
} from "@/lib/types";
import { UserError, type Backend } from "../backend";
import { createSupabaseServerClient } from "./client";

type Db = SupabaseClient<Database>;

const MATERIAL_COLUMNS = `
  id, title, description, original_filename, content_type, kind, size_bytes, status,
  rejection_reason, suggested_faculty, created_at, storage_path,
  course:courses!inner(id, code, title),
  faculty:faculty(id, name, short_form),
  uploader:profiles!materials_uploader_id_fkey(id, full_name)
` as const;

interface MaterialRow {
  id: string;
  title: string;
  description: string | null;
  original_filename: string;
  content_type: string;
  kind: Material["kind"];
  size_bytes: number;
  status: MaterialStatus;
  rejection_reason: string | null;
  suggested_faculty: string | null;
  created_at: string;
  storage_path: string;
  course: { id: string; code: string; title: string };
  faculty: { id: string; name: string; short_form: string | null } | null;
  uploader: { id: string; full_name: string } | null;
}

function toMaterial(r: MaterialRow): Material {
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    originalFilename: r.original_filename,
    contentType: r.content_type,
    kind: r.kind,
    sizeBytes: r.size_bytes,
    status: r.status,
    rejectionReason: r.rejection_reason,
    suggestedFaculty: r.suggested_faculty,
    createdAt: r.created_at,
    storagePath: r.storage_path,
    course: r.course,
    faculty: r.faculty ? { id: r.faculty.id, name: r.faculty.name, shortForm: r.faculty.short_form } : null,
    uploader: r.uploader ? { id: r.uploader.id, name: r.uploader.full_name || "EDU student" } : null,
  };
}

interface CourseStatsRow {
  id: string;
  code: string;
  title: string;
  credit_hours: number | null;
  department_code: string;
  department_name: string;
  faculty_count: number;
  material_count: number;
}

function toCourseSummary(r: CourseStatsRow): CourseSummary {
  return {
    id: r.id,
    code: r.code,
    title: r.title,
    creditHours: r.credit_hours === null ? null : Number(r.credit_hours),
    department: { code: r.department_code, name: r.department_name },
    facultyCount: Number(r.faculty_count),
    materialCount: Number(r.material_count),
  };
}

interface FacultyRow {
  id: string;
  name: string;
  short_form: string | null;
  email: string | null;
  department_id: string | null;
  department: { code: string } | null;
}

function toFaculty(r: FacultyRow): FacultyMember {
  return {
    id: r.id,
    name: r.name,
    shortForm: r.short_form,
    email: r.email,
    departmentId: r.department_id,
    departmentCode: r.department?.code ?? null,
  };
}

interface PgError {
  code?: string;
  message: string;
}

/** Turn a database error into a message that is safe and useful to show. */
function dbError(error: PgError, context: string): Error {
  switch (error.code) {
    case "23505":
      return new UserError(`${context}: that already exists.`);
    case "23503":
      return new UserError(`${context}: it is still in use by other records.`);
    case "23514":
    case "22P02":
      return new UserError(`${context}: some values are invalid.`);
    case "42501":
      return new UserError("You don't have permission to do that.");
    default:
      console.error(`[supabase] ${context}:`, error.code, error.message);
      return new Error(`${context} failed`);
  }
}

type DbResult = { data: unknown; error: PgError | null };

function check<R extends DbResult>(result: R, context: string): NonNullable<R["data"]> {
  if (result.error) throw dbError(result.error, context);
  if (result.data === null || result.data === undefined) throw new Error(`${context}: no data returned`);
  return result.data as NonNullable<R["data"]>;
}

/** Like check(), for single-row lookups where "not found" is a normal answer. */
/** For inserts/updates/deletes that don't return rows. */
function write(result: { error: PgError | null }, context: string): void {
  if (result.error) throw dbError(result.error, context);
}

function maybe<R extends DbResult>(result: R, context: string): NonNullable<R["data"]> | null {
  if (result.error) throw dbError(result.error, context);
  return (result.data ?? null) as NonNullable<R["data"]> | null;
}

/** Map Supabase Auth errors to friendly, non-enumerating messages. */
function authError(error: { message: string; status?: number; code?: string }): Error {
  if (error.status === 429 || error.code === "over_email_send_rate_limit" || error.code === "over_request_rate_limit") {
    return new UserError("Too many attempts. Please wait a minute and try again.");
  }
  if (error.code === "weak_password") return new UserError(error.message);
  if (error.code === "same_password") return new UserError("Choose a password different from your current one.");
  if (error.code === "otp_expired" || error.code === "invalid_credentials") {
    return new UserError("That code is invalid or has expired.");
  }
  console.error("[supabase auth]", error.code, error.status, error.message);
  return new UserError("Something went wrong. Please try again.");
}

export async function createSupabaseBackend(): Promise<Backend> {
  const db: Db = await createSupabaseServerClient();

  let viewerPromise: Promise<Viewer | null> | null = null;

  async function userId(): Promise<string | null> {
    const { data } = await db.auth.getClaims();
    return typeof data?.claims.sub === "string" ? data.claims.sub : null;
  }

  async function requireUserId(): Promise<string> {
    const id = await userId();
    if (!id) throw new UserError("Please sign in first.");
    return id;
  }

  function avatarUrl(path: string | null): string | null {
    return path ? db.storage.from("avatars").getPublicUrl(path).data.publicUrl : null;
  }

  async function loadViewer(): Promise<Viewer | null> {
    const id = await userId();
    if (!id) return null;
    const { data, error } = await db.rpc("get_my_profile").maybeSingle();
    if (error || !data) return null;
    return {
      id: data.id,
      email: data.email,
      fullName: data.full_name,
      role: data.role,
      studentId: data.student_id,
      departmentId: data.department_id,
      departmentCode: data.department_code,
      departmentName: data.department_name,
      semester: data.semester,
      avatarUrl: avatarUrl(data.avatar_path),
      onboarded: data.onboarded_at !== null,
    };
  }

  const backend: Backend = {
    mode: "supabase",

    getViewer() {
      viewerPromise ??= loadViewer();
      return viewerPromise;
    },

    async requestCode(email, { createUser }) {
      const { error } = await db.auth.signInWithOtp({ email, options: { shouldCreateUser: createUser } });
      if (!error) return;
      // Unknown address while signing in: report success anyway, so the form
      // cannot be used to discover which emails have accounts.
      if (!createUser && (error.code === "otp_disabled" || error.code === "user_not_found" || error.status === 422)) return;
      throw authError(error);
    },

    async verifyCode(email, code) {
      const { error } = await db.auth.verifyOtp({ email, token: code, type: "email" });
      if (error) throw error.status === 429 ? authError(error) : new UserError("That code is invalid or has expired.");
    },

    async signInWithPassword(email, password) {
      const { error } = await db.auth.signInWithPassword({ email, password });
      if (!error) return;
      if (error.status === 429) throw authError(error);
      throw new UserError("Incorrect email or password.");
    },

    async setPassword(password) {
      await requireUserId();
      const { error } = await db.auth.updateUser({ password });
      if (error) throw authError(error);
    },

    async signOut() {
      await db.auth.signOut({ scope: "local" });
    },

    async updateProfile(input) {
      const id = await requireUserId();
      write(
        await db
          .from("profiles")
          .update({
            full_name: input.fullName,
            student_id: input.studentId,
            department_id: input.departmentId,
            semester: input.semester,
            ...(input.markOnboarded ? { onboarded_at: new Date().toISOString() } : {}),
          })
          .eq("id", id),
        "Saving your profile",
      );
    },

    async setAvatar(file) {
      const id = await requireUserId();
      const old = maybe(await db.rpc("get_my_profile").maybeSingle(), "Loading profile")?.avatar_path ?? null;
      let path: string | null = null;
      if (file) {
        path = `${id}/${crypto.randomUUID()}.${file.ext}`;
        const { error } = await db.storage
          .from("avatars")
          .upload(path, file.bytes, { contentType: file.contentType, upsert: false, cacheControl: "31536000" });
        if (error) {
          console.error("[supabase storage] avatar upload:", error.message);
          throw new UserError("Couldn't upload that picture. Please try again.");
        }
      }
      write(await db.from("profiles").update({ avatar_path: path }).eq("id", id), "Saving your picture");
      if (old) await db.storage.from("avatars").remove([old]);
      viewerPromise = null;
    },

    async listDepartments() {
      const rows = check(await db.rpc("department_stats"), "Loading departments");
      return rows.map((d) => ({
        id: d.id, code: d.code, name: d.name,
        courseCount: Number(d.course_count), materialCount: Number(d.material_count),
      }));
    },

    async getDepartment(code) {
      return maybe(
        await db.from("departments").select("id, code, name").eq("code", code.toUpperCase()).maybeSingle(),
        "Loading department",
      );
    },

    async searchCourses({ query, department, page, pageSize }) {
      const rows = check(
        await db.rpc("search_courses", {
          p_query: query ?? "",
          p_department: department ?? "",
          p_limit: pageSize,
          p_offset: page * pageSize,
        }),
        "Searching courses",
      );
      let total = Number(rows[0]?.total_count ?? 0);
      // Past the last page the window count is unavailable; ask for it.
      if (rows.length === 0 && page > 0) {
        const first = check(
          await db.rpc("search_courses", { p_query: query ?? "", p_department: department ?? "", p_limit: 1, p_offset: 0 }),
          "Searching courses",
        );
        total = Number(first[0]?.total_count ?? 0);
      }
      return { items: rows.map(toCourseSummary), total, page, pageSize };
    },

    async getCourseByCode(code) {
      const row = maybe(
        await db
          .from("courses")
          .select(`id, code, title, credit_hours, department:departments!inner(id, code, name),
                   course_faculty(faculty(id, name, short_form, email, department_id, department:departments(code)))`)
          .eq("code", code)
          .maybeSingle(),
        "Loading course",
      );
      if (!row) return null;
      const faculty = row.course_faculty
        .map((cf) => cf.faculty)
        .filter((f): f is FacultyRow => f !== null)
        .map(toFaculty)
        .sort((a, b) => a.name.localeCompare(b.name));
      return {
        id: row.id,
        code: row.code,
        title: row.title,
        creditHours: row.credit_hours === null ? null : Number(row.credit_hours),
        department: row.department,
        faculty,
      };
    },

    async listCourseOptions() {
      const rows = check(
        await db
          .from("courses")
          .select("id, code, title, department:departments!inner(code), course_faculty(faculty_id)")
          .order("code"),
        "Loading courses",
      );
      return rows.map((c) => ({
        id: c.id, code: c.code, title: c.title, departmentCode: c.department.code,
        facultyIds: c.course_faculty.map((cf) => cf.faculty_id),
      }));
    },

    async listFaculty() {
      const rows = check(
        await db
          .from("faculty")
          .select("id, name, short_form, email, department_id, department:departments(code)")
          .order("name"),
        "Loading faculty",
      );
      return rows.map(toFaculty);
    },

    async searchFaculty(query) {
      const rows = check(await db.rpc("search_faculty", { p_query: query, p_limit: 12 }), "Searching faculty");
      return rows.map((f) => ({
        id: f.id, name: f.name, shortForm: f.short_form, departmentCode: f.department_code,
        courseCount: Number(f.course_count),
      }));
    },

    async searchMaterials(query) {
      const rows = check(await db.rpc("search_materials", { p_query: query, p_limit: 12 }), "Searching materials");
      return rows.map((m) => ({
        id: m.id, title: m.title, kind: m.kind, sizeBytes: Number(m.size_bytes), createdAt: m.created_at,
        courseCode: m.course_code, courseTitle: m.course_title, facultyName: m.faculty_name,
      }));
    },

    async listCourseMaterials(courseId, { facultyId, kind, page, pageSize }) {
      const uid = await userId();
      let q = db
        .from("materials")
        .select(MATERIAL_COLUMNS, { count: "exact" })
        .eq("course_id", courseId)
        .neq("status", "rejected");
      // Approved for everyone, plus the viewer's own pending uploads. (Admins
      // review pending items in the moderation queue instead.)
      q = uid ? q.or(`status.eq.approved,uploader_id.eq.${uid}`) : q.eq("status", "approved");
      if (facultyId) q = q.eq("faculty_id", facultyId);
      if (kind) q = q.eq("kind", kind);
      const { data, error, count } = await q
        .order("created_at", { ascending: false })
        .range(page * pageSize, page * pageSize + pageSize - 1);
      if (error && error.code === "PGRST103") return { items: [], total: count ?? 0, page, pageSize };
      if (error) throw dbError(error, "Loading materials");
      return { items: (data as MaterialRow[]).map(toMaterial), total: count ?? 0, page, pageSize };
    },

    async listRecentMaterials(limit) {
      const rows = check(
        await db.from("materials").select(MATERIAL_COLUMNS).eq("status", "approved")
          .order("created_at", { ascending: false }).limit(limit),
        "Loading recent materials",
      );
      return (rows as MaterialRow[]).map(toMaterial);
    },

    async listMyUploads() {
      const uid = await requireUserId();
      const rows = check(
        await db.from("materials").select(MATERIAL_COLUMNS).eq("uploader_id", uid)
          .order("created_at", { ascending: false }).limit(200),
        "Loading your uploads",
      );
      return (rows as MaterialRow[]).map(toMaterial);
    },

    async getMaterial(id) {
      const row = maybe(await db.from("materials").select(MATERIAL_COLUMNS).eq("id", id).maybeSingle(), "Loading material");
      return row ? toMaterial(row as MaterialRow) : null;
    },

    async materialFileUrl(material, { download }) {
      const { data, error } = await db.storage
        .from("materials")
        .createSignedUrl(material.storagePath, 300, { download: download ? material.originalFilename : false });
      if (error || !data) throw new UserError("This file is not available.");
      return data.signedUrl;
    },

    async readUploadHead(path) {
      const { data, error } = await db.storage.from("materials").createSignedUrl(path, 60);
      if (error || !data) throw new UserError("The uploaded file could not be found. Please upload it again.");
      const res = await fetch(data.signedUrl, { headers: { Range: "bytes=0-15" }, cache: "no-store" });
      if (!res.ok) throw new UserError("The uploaded file could not be read. Please upload it again.");
      return new Uint8Array(await res.arrayBuffer()).slice(0, 16);
    },

    async createUploadTarget(ext) {
      const uid = await requireUserId();
      const path = `uploads/${uid}/${crypto.randomUUID()}.${ext}`;
      const { data, error } = await db.storage.from("materials").createSignedUploadUrl(path);
      if (error || !data) {
        console.error("[supabase storage] signed upload url:", error?.message);
        throw new UserError("Uploads are not available for your account right now.");
      }
      return { kind: "supabase", path: data.path, token: data.token };
    },

    async discardUpload(path) {
      const { error } = await db.storage.from("materials").remove([path]);
      if (error) console.error("[supabase storage] discard upload:", error.message);
    },

    async createMaterial(input) {
      await requireUserId();
      const { data, error } = await db
        .from("materials")
        .insert({
          course_id: input.courseId,
          faculty_id: input.facultyId,
          suggested_faculty: input.suggestedFaculty,
          title: input.title,
          description: input.description,
          original_filename: input.originalFilename,
          storage_path: input.storagePath,
          content_type: input.contentType,
          kind: input.kind,
          size_bytes: input.sizeBytes,
        })
        .select("id, status")
        .single();
      if (error) {
        if (error.code === "23514" || error.code === "42501") {
          console.error("[supabase] material rejected by database:", error.message);
          throw new UserError("The upload could not be verified. Please try again.");
        }
        throw dbError(error, "Saving the material");
      }
      return data;
    },

    async deleteMaterial(id) {
      const rows = check(await db.from("materials").delete().eq("id", id).select("storage_path"), "Deleting the material");
      const row = rows[0];
      if (!row) throw new UserError("That material doesn't exist or you can't delete it.");
      const { error } = await db.storage.from("materials").remove([row.storage_path]);
      if (error) console.error("[supabase storage] orphaned file after delete:", row.storage_path, error.message);
    },

    async listMyCourses() {
      if (!(await userId())) return [];
      const rows = check(await db.rpc("my_courses"), "Loading your courses");
      return rows.map(toCourseSummary);
    },

    async myCourseIds() {
      const uid = await userId();
      if (!uid) return new Set();
      const rows = check(await db.from("enrollments").select("course_id").eq("user_id", uid), "Loading your courses");
      return new Set(rows.map((r) => r.course_id));
    },

    async enroll(courseId) {
      const uid = await requireUserId();
      const { error } = await db.from("enrollments").insert({ user_id: uid, course_id: courseId });
      if (error && error.code !== "23505") throw dbError(error, "Adding the course");
    },

    async unenroll(courseId) {
      const uid = await requireUserId();
      write(await db.from("enrollments").delete().eq("user_id", uid).eq("course_id", courseId), "Removing the course");
    },

    async adminStats() {
      const count = async (q: PromiseLike<{ count: number | null; error: PgError | null }>) => {
        const { count: n, error } = await q;
        if (error) throw dbError(error, "Loading statistics");
        return n ?? 0;
      };
      const [pendingMaterials, approvedMaterials, courses, faculty, departments] = await Promise.all([
        count(db.from("materials").select("id", { count: "exact", head: true }).eq("status", "pending")),
        count(db.from("materials").select("id", { count: "exact", head: true }).eq("status", "approved")),
        count(db.from("courses").select("id", { count: "exact", head: true })),
        count(db.from("faculty").select("id", { count: "exact", head: true })),
        count(db.from("departments").select("id", { count: "exact", head: true })),
      ]);
      return { pendingMaterials, approvedMaterials, courses, faculty, departments };
    },

    async listPendingMaterials(page, pageSize) {
      const { data, error, count } = await db
        .from("materials")
        .select(MATERIAL_COLUMNS, { count: "exact" })
        .eq("status", "pending")
        .order("created_at", { ascending: true })
        .range(page * pageSize, page * pageSize + pageSize - 1);
      if (error && error.code === "PGRST103") return { items: [], total: count ?? 0, page, pageSize };
      if (error) throw dbError(error, "Loading the queue");
      return { items: (data as MaterialRow[]).map(toMaterial), total: count ?? 0, page, pageSize };
    },

    async reviewMaterial(id, review) {
      if (review.action === "approve") {
        const rows = check(
          await db.from("materials")
            .update({ status: "approved", faculty_id: review.facultyId, title: review.title })
            .eq("id", id).select("id"),
          "Approving",
        );
        if (!rows.length) throw new UserError("That material no longer exists, or you can't moderate it.");
        return;
      }
      const rows = check(
        await db.from("materials")
          .update({ status: "rejected", rejection_reason: review.reason })
          .eq("id", id).select("storage_path"),
        "Rejecting",
      );
      const row = rows[0];
      if (!row) throw new UserError("That material no longer exists, or you can't moderate it.");
      // The record stays (so the uploader sees why); the file itself is removed.
      const { error } = await db.storage.from("materials").remove([row.storage_path]);
      if (error) console.error("[supabase storage] rejected file not removed:", row.storage_path, error.message);
    },

    async saveDepartment(id, input) {
      if (id) write(await db.from("departments").update(input).eq("id", id), "Saving the department");
      else write(await db.from("departments").insert(input), "Adding the department");
    },

    async deleteDepartment(id) {
      write(await db.from("departments").delete().eq("id", id), "Deleting the department");
    },

    async saveFaculty(id, input) {
      const row = {
        name: input.name, short_form: input.shortForm, email: input.email, department_id: input.departmentId,
      };
      if (id) write(await db.from("faculty").update(row).eq("id", id), "Saving the instructor");
      else write(await db.from("faculty").insert(row), "Adding the instructor");
    },

    async deleteFaculty(id) {
      write(await db.from("faculty").delete().eq("id", id), "Deleting the instructor");
    },

    async saveCourse(id, input) {
      const row = {
        code: input.code, title: input.title, department_id: input.departmentId, credit_hours: input.creditHours,
      };
      let courseId = id;
      if (courseId) {
        write(await db.from("courses").update(row).eq("id", courseId), "Saving the course");
      } else {
        courseId = check(await db.from("courses").insert(row).select("id").single(), "Adding the course").id;
      }
      const current = check(
        await db.from("course_faculty").select("faculty_id").eq("course_id", courseId),
        "Saving instructors",
      ).map((r) => r.faculty_id);
      const remove = current.filter((f) => !input.facultyIds.includes(f));
      const add = input.facultyIds.filter((f) => !current.includes(f));
      if (remove.length) {
        write(
          await db.from("course_faculty").delete().eq("course_id", courseId).in("faculty_id", remove),
          "Saving instructors",
        );
      }
      if (add.length) {
        write(
          await db.from("course_faculty").insert(add.map((faculty_id) => ({ course_id: courseId, faculty_id }))),
          "Saving instructors",
        );
      }
    },

    async deleteCourse(id) {
      const { error } = await db.from("courses").delete().eq("id", id);
      if (error?.code === "23503") {
        throw new UserError("This course still has materials. Delete or move them before removing the course.");
      }
      if (error) throw dbError(error, "Deleting the course");
    },
  };

  return backend;
}
