-- EDU ClassRepo schema.
--
-- Security model (enforced here, not in the UI):
--   * anon + authenticated may read the catalog and APPROVED materials only.
--   * a verified university member may manage their own profile fields,
--     enrollments and uploads; uploads always start as PENDING.
--   * only role = 'admin' may change the catalog or moderate materials.
--   * nobody can grant themselves a role: `role` has no UPDATE grant.
-- Helpers that must bypass RLS live in the `private` schema, which the Data
-- API does not expose.

create schema if not exists private;
grant usage on schema private to anon, authenticated, service_role;

create type public.user_role as enum ('student', 'faculty', 'admin');
create type public.material_status as enum ('pending', 'approved', 'rejected');
create type public.material_kind as enum ('pdf', 'document', 'presentation', 'image');

-- ── Configuration ────────────────────────────────────────────────────────────

-- Sign-up is limited to these email domains (checked by a trigger on
-- auth.users, so it also applies to direct calls to the Auth API).
create table private.allowed_email_domains (
  domain text primary key check (domain = lower(domain) and domain !~ '[@\s]')
);
insert into private.allowed_email_domains (domain) values ('eastdelta.edu.bd');

-- Individual addresses outside those domains that may still sign up, e.g. an
-- administrator's personal address. Managed by the owner in the SQL editor.
create table private.allowed_emails (
  email text primary key check (email = lower(email))
);

-- ── Helpers ──────────────────────────────────────────────────────────────────

create function private.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create function private.email_is_allowed(p_email text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from private.allowed_email_domains d
    where lower(p_email) like '%@' || d.domain
  ) or exists (
    select 1 from private.allowed_emails e where e.email = lower(p_email)
  );
$$;

-- A signed-in user whose email is confirmed and still allowed.
create function private.is_verified_member() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from auth.users u
    where u.id = (select auth.uid())
      and u.email_confirmed_at is not null
      and private.email_is_allowed(u.email)
  );
$$;

create function private.escape_like(p_text text) returns text
language sql immutable set search_path = '' as $$
  select replace(replace(replace(coalesce(p_text, ''), '\', '\\'), '%', '\%'), '_', '\_');
$$;

grant execute on function private.is_verified_member(), private.escape_like(text) to anon, authenticated;
revoke execute on function private.email_is_allowed(text) from public, anon, authenticated;

-- ── Catalog ──────────────────────────────────────────────────────────────────

create table public.departments (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z][A-Z0-9]{1,11}$'),
  name text not null check (char_length(btrim(name)) between 2 and 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.faculty (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 2 and 150),
  short_form text unique check (short_form ~ '^[A-Z][A-Z0-9.]{0,11}$'),
  email text check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(email) <= 150),
  department_id uuid references public.departments (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index faculty_department_id_idx on public.faculty (department_id);

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z]{2,6} [0-9]{3,4}[A-Z]?$'),
  title text not null check (char_length(btrim(title)) between 2 and 250),
  department_id uuid not null references public.departments (id) on delete restrict,
  credit_hours numeric(3, 1) check (credit_hours > 0 and credit_hours <= 12),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index courses_department_id_idx on public.courses (department_id);

create table public.course_faculty (
  course_id uuid not null references public.courses (id) on delete cascade,
  faculty_id uuid not null references public.faculty (id) on delete cascade,
  primary key (course_id, faculty_id)
);
create index course_faculty_faculty_id_idx on public.course_faculty (faculty_id);

create trigger departments_updated_at before update on public.departments
  for each row execute function private.set_updated_at();
create trigger faculty_updated_at before update on public.faculty
  for each row execute function private.set_updated_at();
create trigger courses_updated_at before update on public.courses
  for each row execute function private.set_updated_at();

-- ── Profiles ─────────────────────────────────────────────────────────────────

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  full_name text not null default '' check (char_length(full_name) <= 100),
  role public.user_role not null default 'student',
  student_id text check (student_id ~ '^[A-Za-z0-9-]{1,30}$'),
  department_id uuid references public.departments (id) on delete set null,
  semester smallint check (semester between 1 and 15),
  avatar_path text check (avatar_path is null or avatar_path like id::text || '/%'),
  onboarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_updated_at before update on public.profiles
  for each row execute function private.set_updated_at();

create function private.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

grant execute on function private.is_admin() to anon, authenticated;

-- Enforce the email allowlist for every sign-up and email change.
create function private.enforce_email_domain() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.email is null or not private.email_is_allowed(new.email) then
    raise exception 'Sign-up is limited to university email addresses'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger enforce_email_domain
  before insert or update of email on auth.users
  for each row execute function private.enforce_email_domain();

-- Create the profile row. Metadata is user-supplied, so every value is
-- validated and silently dropped if invalid; role is never taken from it.
create function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_name text := left(btrim(coalesce(meta ->> 'full_name', '')), 100);
  v_student_id text := btrim(coalesce(meta ->> 'student_id', ''));
  v_department uuid;
  v_semester smallint;
begin
  if v_student_id !~ '^[A-Za-z0-9-]{1,30}$' then
    v_student_id := null;
  end if;
  begin
    v_department := (meta ->> 'department_id')::uuid;
    if not exists (select 1 from public.departments where id = v_department) then
      v_department := null;
    end if;
  exception when others then
    v_department := null;
  end;
  begin
    v_semester := (meta ->> 'semester')::smallint;
    if v_semester not between 1 and 15 then v_semester := null; end if;
  exception when others then
    v_semester := null;
  end;

  insert into public.profiles (id, email, full_name, student_id, department_id, semester)
  values (new.id, lower(new.email), v_name, v_student_id, v_department, v_semester);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

create function private.sync_profile_email() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.profiles set email = lower(new.email) where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row when (old.email is distinct from new.email)
  execute function private.sync_profile_email();

-- ── Enrollments ──────────────────────────────────────────────────────────────

create table public.enrollments (
  user_id uuid not null references public.profiles (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, course_id)
);
create index enrollments_course_id_idx on public.enrollments (course_id);

-- ── Materials ────────────────────────────────────────────────────────────────

create table public.materials (
  id uuid primary key default gen_random_uuid(),
  -- RESTRICT: a course with materials must have them removed through the app
  -- first, so their files are deleted from storage rather than orphaned.
  course_id uuid not null references public.courses (id) on delete restrict,
  faculty_id uuid references public.faculty (id) on delete set null,
  uploader_id uuid references public.profiles (id) on delete set null,
  title text not null check (char_length(btrim(title)) between 1 and 200),
  description text check (char_length(description) <= 1000),
  suggested_faculty text check (char_length(suggested_faculty) <= 150),
  original_filename text not null check (char_length(original_filename) between 1 and 255),
  storage_path text not null unique,
  content_type text not null check (content_type in (
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'image/jpeg', 'image/png', 'image/gif', 'image/webp'
  )),
  kind public.material_kind not null,
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 52428800),
  status public.material_status not null default 'pending',
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  rejection_reason text check (char_length(rejection_reason) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index materials_course_status_idx on public.materials (course_id, status, created_at desc);
create index materials_uploader_idx on public.materials (uploader_id, created_at desc);
create index materials_status_idx on public.materials (status, created_at);
create index materials_faculty_idx on public.materials (faculty_id);
create index materials_reviewed_by_idx on public.materials (reviewed_by);

-- On insert: the row must point at a file this user just uploaded to their own
-- folder, with matching size and type. Admin uploads publish immediately;
-- everyone else's start PENDING regardless of what the client sent.
create function private.materials_before_insert() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  obj record;
  uid uuid := (select auth.uid());
begin
  if uid is null then
    raise exception 'Not signed in' using errcode = 'insufficient_privilege';
  end if;
  new.uploader_id := uid;

  if new.storage_path not like 'uploads/' || uid::text || '/%' then
    raise exception 'Invalid storage path' using errcode = 'check_violation';
  end if;

  select o.owner_id, (o.metadata ->> 'size')::bigint as size, o.metadata ->> 'mimetype' as mimetype
    into obj
    from storage.objects o
   where o.bucket_id = 'materials' and o.name = new.storage_path;
  if not found then
    raise exception 'Uploaded file not found' using errcode = 'check_violation';
  end if;
  if obj.owner_id is distinct from uid::text then
    raise exception 'Uploaded file belongs to another user' using errcode = 'insufficient_privilege';
  end if;
  if obj.size is distinct from new.size_bytes or obj.mimetype is distinct from new.content_type then
    raise exception 'File metadata does not match the upload' using errcode = 'check_violation';
  end if;

  if private.is_admin() then
    new.status := 'approved';
    new.reviewed_by := uid;
    new.reviewed_at := now();
  else
    new.status := 'pending';
    new.reviewed_by := null;
    new.reviewed_at := null;
    new.rejection_reason := null;
  end if;
  return new;
end;
$$;

create trigger materials_before_insert before insert on public.materials
  for each row execute function private.materials_before_insert();

-- On moderation: record who reviewed it and when.
create function private.materials_before_update() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status is distinct from old.status then
    new.reviewed_by := (select auth.uid());
    new.reviewed_at := now();
    if new.status <> 'rejected' then
      new.rejection_reason := null;
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger materials_before_update before update on public.materials
  for each row execute function private.materials_before_update();

-- ── Row level security ───────────────────────────────────────────────────────

alter table public.departments enable row level security;
alter table public.faculty enable row level security;
alter table public.courses enable row level security;
alter table public.course_faculty enable row level security;
alter table public.profiles enable row level security;
alter table public.enrollments enable row level security;
alter table public.materials enable row level security;

-- Catalog: public read, admin write.
create policy "catalog is public" on public.departments for select to anon, authenticated using (true);
create policy "admins insert departments" on public.departments for insert to authenticated with check ((select private.is_admin()));
create policy "admins update departments" on public.departments for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "admins delete departments" on public.departments for delete to authenticated using ((select private.is_admin()));

create policy "catalog is public" on public.faculty for select to anon, authenticated using (true);
create policy "admins insert faculty" on public.faculty for insert to authenticated with check ((select private.is_admin()));
create policy "admins update faculty" on public.faculty for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "admins delete faculty" on public.faculty for delete to authenticated using ((select private.is_admin()));

create policy "catalog is public" on public.courses for select to anon, authenticated using (true);
create policy "admins insert courses" on public.courses for insert to authenticated with check ((select private.is_admin()));
create policy "admins update courses" on public.courses for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "admins delete courses" on public.courses for delete to authenticated using ((select private.is_admin()));

create policy "catalog is public" on public.course_faculty for select to anon, authenticated using (true);
create policy "admins insert course_faculty" on public.course_faculty for insert to authenticated with check ((select private.is_admin()));
create policy "admins delete course_faculty" on public.course_faculty for delete to authenticated using ((select private.is_admin()));

-- Profiles: rows are readable (contributor names are shown on materials) but
-- only non-sensitive columns are granted. Email, student ID and semester are
-- read through get_my_profile() / admin functions.
create policy "profiles are readable" on public.profiles for select to anon, authenticated using (true);
create policy "users update own profile" on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

revoke all on public.profiles from anon, authenticated;
grant select (id, full_name, role, department_id, avatar_path, created_at) on public.profiles to anon, authenticated;
grant update (full_name, student_id, department_id, semester, avatar_path, onboarded_at) on public.profiles to authenticated;

-- Enrollments: private to their owner.
create policy "users read own enrollments" on public.enrollments for select to authenticated
  using (user_id = (select auth.uid()));
create policy "members enroll themselves" on public.enrollments for insert to authenticated
  with check (user_id = (select auth.uid()) and (select private.is_verified_member()));
create policy "users unenroll themselves" on public.enrollments for delete to authenticated
  using (user_id = (select auth.uid()));

-- Materials.
create policy "approved materials are public" on public.materials for select to anon, authenticated
  using (status = 'approved' or uploader_id = (select auth.uid()) or (select private.is_admin()));
create policy "members upload materials" on public.materials for insert to authenticated
  with check (uploader_id = (select auth.uid()) and (select private.is_verified_member()));
create policy "admins moderate materials" on public.materials for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "uploaders and admins delete materials" on public.materials for delete to authenticated
  using (uploader_id = (select auth.uid()) or (select private.is_admin()));

revoke update on public.materials from anon, authenticated;
grant update (title, description, faculty_id, status, rejection_reason) on public.materials to authenticated;

-- ── Storage ──────────────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('materials', 'materials', false, 52428800, array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'image/jpeg', 'image/png', 'image/gif', 'image/webp'
  ]),
  ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- materials bucket: private. Files live at uploads/<uid>/<random>.<ext>.
create policy "members upload to own folder" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'materials'
    and (storage.foldername(name))[1] = 'uploads'
    and (storage.foldername(name))[2] = (select auth.uid())::text
    and (select private.is_verified_member())
  );
create policy "read approved, own, or as admin" on storage.objects for select to anon, authenticated
  using (
    bucket_id = 'materials' and (
      owner_id = (select auth.uid())::text
      or (select private.is_admin())
      or exists (
        select 1 from public.materials m
        where m.storage_path = storage.objects.name and m.status = 'approved'
      )
    )
  );
create policy "owners and admins delete material files" on storage.objects for delete to authenticated
  using (bucket_id = 'materials' and (owner_id = (select auth.uid())::text or (select private.is_admin())));

-- avatars bucket: public read via URL; writes only inside <uid>/.
create policy "users manage own avatar" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "users read own avatar objects" on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "users delete own avatar" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- ── Read functions (security invoker: RLS still applies) ─────────────────────

create function public.get_my_profile()
returns table (
  id uuid, email text, full_name text, role public.user_role, student_id text,
  department_id uuid, department_code text, department_name text,
  semester smallint, avatar_path text, onboarded_at timestamptz
)
language sql stable security definer set search_path = '' as $$
  select p.id, p.email, p.full_name, p.role, p.student_id,
         p.department_id, d.code, d.name, p.semester, p.avatar_path, p.onboarded_at
    from public.profiles p
    left join public.departments d on d.id = p.department_id
   where p.id = (select auth.uid());
$$;
revoke execute on function public.get_my_profile() from public, anon;
grant execute on function public.get_my_profile() to authenticated;

create function public.search_courses(
  p_query text default null,
  p_department text default null,
  p_limit int default 24,
  p_offset int default 0
)
returns table (
  id uuid, code text, title text, credit_hours numeric,
  department_code text, department_name text,
  faculty_count bigint, material_count bigint, total_count bigint
)
language sql stable security invoker set search_path = '' as $$
  with q as (
    select nullif(btrim(p_query), '') as term,
           '%' || private.escape_like(btrim(p_query)) || '%' as pattern,
           '%' || private.escape_like(replace(p_query, ' ', '')) || '%' as compact
  ),
  filtered as (
    select c.id, c.code, c.title, c.credit_hours, d.code as dcode, d.name as dname
      from public.courses c
      join public.departments d on d.id = c.department_id, q
     where (p_department is null or p_department = '' or d.code = upper(p_department))
       and (
         q.term is null
         or c.code ilike q.pattern
         or replace(c.code, ' ', '') ilike q.compact
         or c.title ilike q.pattern
         or d.name ilike q.pattern
         or exists (
           select 1 from public.course_faculty cf
             join public.faculty f on f.id = cf.faculty_id
            where cf.course_id = c.id
              and (f.name ilike q.pattern or f.short_form ilike q.pattern)
         )
       )
  )
  select f.id, f.code, f.title, f.credit_hours, f.dcode, f.dname,
         (select count(*) from public.course_faculty cf where cf.course_id = f.id),
         (select count(*) from public.materials m where m.course_id = f.id and m.status = 'approved'),
         count(*) over ()
    from filtered f
   order by f.code
   limit least(greatest(p_limit, 1), 100)
  offset greatest(p_offset, 0);
$$;

create function public.search_materials(p_query text, p_limit int default 20)
returns table (
  id uuid, title text, kind public.material_kind, size_bytes bigint, created_at timestamptz,
  course_code text, course_title text, faculty_name text
)
language sql stable security invoker set search_path = '' as $$
  select m.id, m.title, m.kind, m.size_bytes, m.created_at, c.code, c.title, f.name
    from public.materials m
    join public.courses c on c.id = m.course_id
    left join public.faculty f on f.id = m.faculty_id
   where m.status = 'approved'
     and nullif(btrim(p_query), '') is not null
     and (m.title ilike '%' || private.escape_like(btrim(p_query)) || '%'
          or m.original_filename ilike '%' || private.escape_like(btrim(p_query)) || '%')
   order by m.created_at desc
   limit least(greatest(p_limit, 1), 50);
$$;

create function public.search_faculty(p_query text, p_limit int default 20)
returns table (id uuid, name text, short_form text, department_code text, course_count bigint)
language sql stable security invoker set search_path = '' as $$
  select f.id, f.name, f.short_form, d.code,
         (select count(*) from public.course_faculty cf where cf.faculty_id = f.id)
    from public.faculty f
    left join public.departments d on d.id = f.department_id
   where nullif(btrim(p_query), '') is not null
     and (f.name ilike '%' || private.escape_like(btrim(p_query)) || '%'
          or f.short_form ilike '%' || private.escape_like(btrim(p_query)) || '%')
   order by f.name
   limit least(greatest(p_limit, 1), 50);
$$;

create function public.department_stats()
returns table (id uuid, code text, name text, course_count bigint, material_count bigint)
language sql stable security invoker set search_path = '' as $$
  select d.id, d.code, d.name,
         (select count(*) from public.courses c where c.department_id = d.id),
         (select count(*) from public.materials m join public.courses c on c.id = m.course_id
           where c.department_id = d.id and m.status = 'approved')
    from public.departments d
   order by d.code;
$$;

create function public.my_courses()
returns table (
  id uuid, code text, title text, credit_hours numeric,
  department_code text, department_name text,
  faculty_count bigint, material_count bigint
)
language sql stable security invoker set search_path = '' as $$
  select c.id, c.code, c.title, c.credit_hours, d.code, d.name,
         (select count(*) from public.course_faculty cf where cf.course_id = c.id),
         (select count(*) from public.materials m where m.course_id = c.id and m.status = 'approved')
    from public.enrollments e
    join public.courses c on c.id = e.course_id
    join public.departments d on d.id = c.department_id
   where e.user_id = (select auth.uid())
   order by c.code;
$$;

grant execute on function public.search_courses(text, text, int, int), public.search_materials(text, int),
  public.search_faculty(text, int), public.department_stats() to anon, authenticated;
revoke execute on function public.my_courses() from public, anon;
grant execute on function public.my_courses() to authenticated;

-- ── Rate limiting (fixed window, server-side only) ───────────────────────────

create table private.rate_limits (
  key text primary key,
  window_start timestamptz not null,
  hits int not null
);

-- Returns true when the call is allowed. Callable only with the service role,
-- so clients cannot spend or reset someone else's budget.
create function public.consume_rate_limit(p_key text, p_limit int, p_window_seconds int)
returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  v_hits int;
begin
  delete from private.rate_limits
   where window_start < now() - make_interval(secs => greatest(p_window_seconds, 3600));

  insert into private.rate_limits as r (key, window_start, hits)
  values (p_key, now(), 1)
  on conflict (key) do update
    set hits = case when r.window_start < now() - make_interval(secs => p_window_seconds)
                    then 1 else r.hits + 1 end,
        window_start = case when r.window_start < now() - make_interval(secs => p_window_seconds)
                            then now() else r.window_start end
  returning hits into v_hits;
  return v_hits <= p_limit;
end;
$$;
revoke execute on function public.consume_rate_limit(text, int, int) from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text, int, int) to service_role;
