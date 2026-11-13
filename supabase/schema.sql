-- ============================================================
-- SISTEMAIA — Esquema Supabase (PostgreSQL)
-- Ejecutar en: Supabase Dashboard -> SQL Editor
-- ============================================================

create extension if not exists pgcrypto;

-- ---------- Perfiles de usuario (docentes/admins) ----------
create table if not exists public.profiles (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  email         text not null unique,
  password_hash text not null,
  role          text not null default 'teacher' check (role in ('admin', 'teacher')),
  created_at    timestamptz not null default now()
);

-- ---------- Alumnos ----------
create table if not exists public.students (
  id         uuid primary key default gen_random_uuid(),
  code       text unique,
  name       text not null,
  email      text,
  group_name text,
  created_at timestamptz not null default now()
);

-- ---------- Rúbricas ----------
create table if not exists public.rubrics (
  id             uuid primary key default gen_random_uuid(),
  title          text not null,
  description    text,
  attachment_url text,
  attachment_name text,
  created_by     uuid references public.profiles(id) on delete set null,
  created_at     timestamptz not null default now()
);

create table if not exists public.rubric_criteria (
  id          uuid primary key default gen_random_uuid(),
  rubric_id   uuid not null references public.rubrics(id) on delete cascade,
  name        text not null,
  description text,
  max_points  numeric not null default 0,
  weight      numeric not null default 1,
  position    integer not null default 0
);

-- ---------- Tareas ----------
create table if not exists public.assignments (
  id             uuid primary key default gen_random_uuid(),
  title          text not null,
  description    text,
  due_date       date,
  rubric_id      uuid not null references public.rubrics(id),
  status         text not null default 'open' check (status in ('open', 'closed')),
  attachment_url text,
  attachment_name text,
  created_by     uuid references public.profiles(id) on delete set null,
  created_at     timestamptz not null default now()
);

-- ---------- Entregas de alumnos ----------
create table if not exists public.submissions (
  id            uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  student_id    uuid not null references public.students(id) on delete cascade,
  file_url      text not null,
  file_name     text,
  notes         text,
  status        text not null default 'submitted' check (status in ('submitted', 'graded', 'reviewed')),
  submitted_at  timestamptz not null default now(),
  unique (assignment_id, student_id)
);

-- ---------- Calificaciones ----------
create table if not exists public.grades (
  id            uuid primary key default gen_random_uuid(),
  submission_id uuid not null unique references public.submissions(id) on delete cascade,
  total_score   numeric not null default 0,
  max_score     numeric not null default 0,
  feedback      text,
  published     boolean not null default false,
  graded_by     uuid references public.profiles(id) on delete set null,
  graded_at     timestamptz,
  created_at    timestamptz not null default now()
);

create table if not exists public.grade_details (
  id          uuid primary key default gen_random_uuid(),
  grade_id    uuid not null references public.grades(id) on delete cascade,
  criterion_id uuid not null references public.rubric_criteria(id) on delete cascade,
  score       numeric not null default 0,
  max_points  numeric not null default 0,
  comment     text
);

-- ---------- Geocercas ----------
create table if not exists public.geofences (
  id         uuid primary key default gen_random_uuid(),
  name       text not null default 'Geocerca',
  type       text not null check (type in ('circle', 'rectangle', 'polygon')),
  geometry   jsonb not null,
  color      text not null default '#6c5ce7',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ---------- Eventos de entrada/salida de geocercas ----------
create table if not exists public.geofence_events (
  id          uuid primary key default gen_random_uuid(),
  geofence_id uuid not null references public.geofences(id) on delete cascade,
  profile_id  uuid references public.profiles(id) on delete set null,
  event_type  text not null check (event_type in ('enter', 'exit')),
  lat         double precision not null,
  lng         double precision not null,
  created_at  timestamptz not null default now()
);

-- ---------- Índices ----------
create index if not exists idx_submissions_assignment on public.submissions(assignment_id);
create index if not exists idx_submissions_student on public.submissions(student_id);
create index if not exists idx_grade_details_grade on public.grade_details(grade_id);
create index if not exists idx_geofence_events_geofence on public.geofence_events(geofence_id);
create index if not exists idx_geofence_events_created on public.geofence_events(created_at desc);

-- ---------- Row Level Security ----------
-- El backend usa la service role key (bypassea RLS).
-- Estas políticas permiten acceso total a usuarios autenticados de Supabase
-- si en el futuro expones el anon key en el frontend.
alter table public.profiles        enable row level security;
alter table public.students        enable row level security;
alter table public.rubrics         enable row level security;
alter table public.rubric_criteria enable row level security;
alter table public.assignments     enable row level security;
alter table public.submissions     enable row level security;
alter table public.grades          enable row level security;
alter table public.grade_details   enable row level security;
alter table public.geofences       enable row level security;
alter table public.geofence_events enable row level security;

do $$
declare t text;
begin
  foreach t in array array[
    'profiles','students','rubrics','rubric_criteria',
    'assignments','submissions','grades','grade_details',
    'geofences','geofence_events'
  ] loop
    execute format(
      'create policy "authenticated full access" on public.%I for all to authenticated using (true) with check (true)',
      t
    );
  end loop;
end $$;

-- ---------- Buckets de Storage ----------
insert into storage.buckets (id, name, public)
values
  ('submissions', 'submissions', false),
  ('assignments', 'assignments', false),
  ('rubrics', 'rubrics', false)
on conflict (id) do nothing;
