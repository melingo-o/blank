# Creator Workspace Setup

## 1. Supabase

Run `supabase/workspace-schema.sql` in the Supabase SQL editor.

Create a private storage bucket:

- Bucket name: `creator-workspace`
- Public bucket: `OFF`

The workspace uses signed upload URLs and signed download URLs from Netlify Functions, so the bucket does not need to be public.

## 2. Netlify environment variables

Add these variables in Netlify:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
WORKSPACE_STORAGE_BUCKET=creator-workspace
WORKSPACE_ADMIN_EMAILS=admin@example.com,founder@example.com
```

## 3. Netlify Identity

Enable Netlify Identity for the site.

The included Identity Functions do two things:

- `identity-validate`: blocks signups unless the email is an approved admin email or matches a creator `login_email`
- `identity-login`: stamps `app_metadata.creator_id` for creators and `app_metadata.roles=["company_admin"]` for admin emails

## 4. Creator records

Each creator row should use a route-safe `id` because the workspace URL is:

```bash
/workspace/{creator_id}
```

Example:

```sql
insert into creators (
  id,
  name,
  channel_name,
  channel_concept,
  join_date,
  channel_url,
  login_email
) values (
  'chaehee',
  '채희',
  'ADHD Life',
  'ADHD lived-experience stories with practical reflection and light humor',
  '2026-02-10',
  'https://youtube.com/@adhdlife',
  'chaehee@example.com'
);
```

## 5. Access model

- Company admins: any email listed in `WORKSPACE_ADMIN_EMAILS`
- Creators: only the creator whose `login_email` matches the Netlify Identity email
- All database writes/reads are routed through Netlify Functions, which enforce the `creator_id` check before touching Supabase

## 6. Routes and files

- Standalone drop-in file: `/workspace/workspace.html`
- App route wrapper: `/workspace` and `/workspace/[creatorId]`
- Static UI modules: `/public/workspace/*` and `/public/components/*`

## 7. Attachment flow

1. Browser requests a signed upload token from `/.netlify/functions/workspace-upload`
2. Browser uploads the file directly to Supabase Storage with the signed token
3. Browser registers metadata through `/.netlify/functions/workspace-save`
4. Workspace reads signed download URLs from `/.netlify/functions/workspace-data`
