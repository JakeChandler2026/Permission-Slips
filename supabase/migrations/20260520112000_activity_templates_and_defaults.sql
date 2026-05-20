alter table public.permission_activities
  add column if not exists default_values jsonb not null default '{}'::jsonb,
  add column if not exists pdf_template_path text,
  add column if not exists pdf_template_url text;

insert into storage.buckets (id, name, public)
values ('permission-slip-templates', 'permission-slip-templates', true)
on conflict (id) do nothing;

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
