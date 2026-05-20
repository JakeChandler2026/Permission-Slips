alter table public.permission_submissions
  add column if not exists submitted_name text,
  add column if not exists submitter_ip text;

update public.permission_submissions
set submitted_name = youth_name
where submitted_name is null;

create index if not exists idx_permission_submissions_submitted_name
on public.permission_submissions(lower(submitted_name));
