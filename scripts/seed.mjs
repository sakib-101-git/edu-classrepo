// Load a catalog (departments, faculty, courses) into Supabase.
//
//   npm run seed                          # the bundled SAMPLE catalog
//   npm run seed -- --file legacy.json    # a catalog exported from the old app
//
// Only inserts rows that do not exist yet (matched by department code, faculty
// short form or name, and course code). Rows you have edited are never
// overwritten, so it is safe to run more than once.
//
// Needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (read from
// .env.local). The service role bypasses RLS, so this runs only on your machine.

import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";

const fileArg = process.argv.indexOf("--file");
const file = fileArg > -1 ? process.argv[fileArg + 1] : new URL("../supabase/sample-catalog.json", import.meta.url);

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local first.");
  process.exit(1);
}

const db = createClient(url, key, { auth: { persistSession: false } });
const catalog = JSON.parse(await readFile(file, "utf8"));

function must({ data, error }, what) {
  if (error) {
    console.error(`Failed to ${what}: ${error.message}`);
    process.exit(1);
  }
  return data;
}

// Departments
const existingDepts = must(await db.from("departments").select("id, code"), "read departments");
const deptId = new Map(existingDepts.map((d) => [d.code, d.id]));
const newDepts = catalog.departments.filter((d) => !deptId.has(d.code.toUpperCase()));
if (newDepts.length) {
  const rows = must(
    await db.from("departments")
      .insert(newDepts.map((d) => ({ code: d.code.toUpperCase(), name: d.name.trim() })))
      .select("id, code"),
    "insert departments",
  );
  rows.forEach((d) => deptId.set(d.code, d.id));
}

// Faculty (matched on short form, falling back to exact name)
const existingFaculty = must(await db.from("faculty").select("id, name, short_form"), "read faculty");
const facultyKey = (f) => (f.shortForm ?? f.short_form ?? "").toUpperCase() || `name:${f.name.trim()}`;
const facultyId = new Map(existingFaculty.map((f) => [facultyKey(f), f.id]));
const newFaculty = (catalog.faculty ?? []).filter((f) => !facultyId.has(facultyKey(f)));
if (newFaculty.length) {
  const rows = must(
    await db.from("faculty")
      .insert(newFaculty.map((f) => ({
        name: f.name.trim(),
        short_form: f.shortForm ? f.shortForm.toUpperCase() : null,
        email: f.email ?? null,
        department_id: f.department ? deptId.get(f.department.toUpperCase()) ?? null : null,
      })))
      .select("id, name, short_form"),
    "insert faculty",
  );
  rows.forEach((f) => facultyId.set(facultyKey(f), f.id));
}

// Courses + course_faculty links
const existingCourses = must(await db.from("courses").select("id, code"), "read courses");
const courseId = new Map(existingCourses.map((c) => [c.code, c.id]));
let skipped = 0;
const newCourses = catalog.courses.filter((c) => {
  if (courseId.has(c.code)) return false;
  if (!deptId.has(c.department.toUpperCase())) {
    console.warn(`Skipping ${c.code}: unknown department ${c.department}`);
    skipped++;
    return false;
  }
  return true;
});
if (newCourses.length) {
  const rows = must(
    await db.from("courses")
      .insert(newCourses.map((c) => ({
        code: c.code,
        title: c.title.trim(),
        department_id: deptId.get(c.department.toUpperCase()),
        credit_hours: c.creditHours ?? null,
      })))
      .select("id, code"),
    "insert courses",
  );
  rows.forEach((c) => courseId.set(c.code, c.id));

  const links = newCourses.flatMap((c) =>
    (c.faculty ?? [])
      .map((sf) => facultyId.get(sf.toUpperCase()))
      .filter(Boolean)
      .map((fid) => ({ course_id: courseId.get(c.code), faculty_id: fid })),
  );
  if (links.length) must(await db.from("course_faculty").insert(links), "link faculty to courses");
}

console.log(
  `Catalog loaded: +${newDepts.length} departments, +${newFaculty.length} faculty, ` +
    `+${newCourses.length} courses${skipped ? `, ${skipped} skipped` : ""}. Existing rows left unchanged.`,
);
