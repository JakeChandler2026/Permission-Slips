# Activity Permission Slip Portal

Static Vercel-friendly app for reusable church activity paperwork.

## What it does

- Shows the original PDF packet in the browser.
- Lets a parent/guardian fill youth, contact, medical, and consent fields.
- Captures a drawn signature and generates a flattened signed PDF.
- Stores submissions locally in demo mode, or in Supabase storage and tables in production.
- Gives admins a dashboard for submissions by youth, activity, ward, parent, and signed PDF.
- Lets admins create reusable activity defaults. Public links can use `?activity=2026-trek`.

## Supabase setup

This repo is linked to the separate `Permission Slips` Supabase project:

- Project ref: `sfdqctljsozhnsokevgh`
- API URL: `https://sfdqctljsozhnsokevgh.supabase.co`

The local migration has already been pushed once with the Supabase CLI. Future GitHub-based migration pushes use `.github/workflows/supabase-migrations.yml`.

1. Add these GitHub repository secrets:
   - `SUPABASE_ACCESS_TOKEN`
   - `SUPABASE_DB_PASSWORD`
   - `SUPABASE_PROJECT_ID` set to `sfdqctljsozhnsokevgh`
2. Run the `Supabase Migrations` workflow from GitHub Actions, or push changes under `supabase/**` to `main`.
3. If applying manually instead, run `npx supabase db push` from this repo.
4. Add at least one admin email:

   ```sql
   insert into public.permission_admins (email)
   values ('you@example.com')
   on conflict (email) do nothing;
   ```

## Legacy Manual Setup

1. Apply `backend/supabase/schema.sql` in the Supabase SQL editor.
2. Add at least one admin email:

   ```sql
   insert into public.permission_admins (email)
   values ('you@example.com')
   on conflict (email) do nothing;
   ```

3. Copy `app-config.example.js` to `app-config.js`.
4. Set `runtimeMode: "supabase"`, your Supabase URL, and anon key.
5. Deploy the folder to Vercel. The `vercel.json` matches the simple static setup used by the Bishop project.

The app now uses its own Supabase database, separate from Bishop.

## Local run

```powershell
npm install
npm run serve
```

Open `http://localhost:4173`.
