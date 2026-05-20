create extension if not exists "pgcrypto";

create table if not exists public.permission_admins (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.permission_activities (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  event_name text not null,
  event_dates text,
  event_description text,
  stake text,
  leader_name text,
  leader_phone text,
  leader_email text,
  default_ward text,
  default_values jsonb not null default '{}'::jsonb,
  pdf_template_path text,
  pdf_template_url text,
  starts_on date,
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.permission_submissions (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid references public.permission_activities(id) on delete set null,
  activity_name text not null,
  submitted_name text,
  youth_name text not null,
  youth_birth_date date,
  parent_name text not null,
  parent_email text not null,
  parent_phone text,
  ward text,
  submitter_ip text,
  pdf_path text not null,
  form_data jsonb not null default '{}'::jsonb,
  submitted_at timestamptz not null default now()
);

create index if not exists idx_permission_activities_slug on public.permission_activities(slug);
create index if not exists idx_permission_submissions_activity on public.permission_submissions(activity_id, submitted_at desc);
create index if not exists idx_permission_submissions_submitted_name on public.permission_submissions(lower(submitted_name));
create index if not exists idx_permission_submissions_youth on public.permission_submissions(lower(youth_name));

create or replace function public.permission_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_permission_activities_updated_at on public.permission_activities;
create trigger set_permission_activities_updated_at
before update on public.permission_activities
for each row
execute function public.permission_set_updated_at();

create or replace function public.current_permission_admin()
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  is_listed_admin boolean;
  is_bishop_admin boolean := false;
begin
  select exists (
    select 1
    from public.permission_admins
    where lower(email) = lower(coalesce(auth.email(), ''))
  ) into is_listed_admin;

  if to_regclass('public.profiles') is not null then
    execute $profile_check$
      select exists (
        select 1
        from public.profiles
        where (auth_user_id = auth.uid() or id = auth.uid())
          and role::text in ('bishop', 'administrator')
      )
    $profile_check$ into is_bishop_admin;
  end if;

  return coalesce(is_listed_admin, false) or coalesce(is_bishop_admin, false);
end;
$$;

alter table public.permission_admins enable row level security;
alter table public.permission_activities enable row level security;
alter table public.permission_submissions enable row level security;

drop policy if exists "permission_admins_self_read" on public.permission_admins;
create policy "permission_admins_self_read"
on public.permission_admins
for select
to authenticated
using (lower(email) = lower(auth.email()) or public.current_permission_admin());

drop policy if exists "permission_activities_public_read" on public.permission_activities;
create policy "permission_activities_public_read"
on public.permission_activities
for select
to anon, authenticated
using (is_active = true or public.current_permission_admin());

drop policy if exists "permission_activities_admin_write" on public.permission_activities;
create policy "permission_activities_admin_write"
on public.permission_activities
for all
to authenticated
using (public.current_permission_admin())
with check (public.current_permission_admin());

drop policy if exists "permission_submissions_public_insert" on public.permission_submissions;
create policy "permission_submissions_public_insert"
on public.permission_submissions
for insert
to anon, authenticated
with check (true);

drop policy if exists "permission_submissions_admin_read" on public.permission_submissions;
create policy "permission_submissions_admin_read"
on public.permission_submissions
for select
to authenticated
using (public.current_permission_admin());

drop policy if exists "permission_submissions_admin_update" on public.permission_submissions;
create policy "permission_submissions_admin_update"
on public.permission_submissions
for update
to authenticated
using (public.current_permission_admin())
with check (public.current_permission_admin());

insert into storage.buckets (id, name, public)
values ('permission-slip-submissions', 'permission-slip-submissions', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('permission-slip-templates', 'permission-slip-templates', true)
on conflict (id) do nothing;

drop policy if exists "permission_slip_public_upload" on storage.objects;
create policy "permission_slip_public_upload"
on storage.objects
for insert
to anon, authenticated
with check (bucket_id = 'permission-slip-submissions');

drop policy if exists "permission_slip_admin_read" on storage.objects;
create policy "permission_slip_admin_read"
on storage.objects
for select
to authenticated
using (bucket_id = 'permission-slip-submissions' and public.current_permission_admin());

drop policy if exists "permission_slip_admin_update" on storage.objects;
create policy "permission_slip_admin_update"
on storage.objects
for update
to authenticated
using (bucket_id = 'permission-slip-submissions' and public.current_permission_admin())
with check (bucket_id = 'permission-slip-submissions' and public.current_permission_admin());

drop policy if exists "permission_template_public_read" on storage.objects;
create policy "permission_template_public_read"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'permission-slip-templates');

drop policy if exists "permission_template_admin_upload" on storage.objects;
create policy "permission_template_admin_upload"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'permission-slip-templates' and public.current_permission_admin());

drop policy if exists "permission_template_admin_update" on storage.objects;
create policy "permission_template_admin_update"
on storage.objects
for update
to authenticated
using (bucket_id = 'permission-slip-templates' and public.current_permission_admin())
with check (bucket_id = 'permission-slip-templates' and public.current_permission_admin());

insert into public.permission_activities (
  slug,
  name,
  event_name,
  event_dates,
  event_description,
  stake,
  leader_name,
  leader_phone,
  leader_email,
  default_ward
) values (
  '2026-trek',
  '2026 Trek',
  '2026 Trek',
  '',
  '',
  '',
  '',
  '',
  '',
  ''
) on conflict (slug) do nothing;
