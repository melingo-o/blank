# Creator Workspace Setup

## 1. Supabase tables

Run `supabase/workspace-schema.sql` in the Supabase SQL editor.

The existing `supabase/schema.sql` should already be applied for:

- `admin_users`
- `portfolio_items`
- `team_members`
- `submissions`

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
WORKSPACE_ADMIN_EMAILS=admin@example.com
WORKSPACE_MASTER_LOGIN_ID=admin
WORKSPACE_MASTER_EMAIL=admin@example.com
```

Notes:

- `WORKSPACE_MASTER_LOGIN_ID` is the admin ID typed on `/admin`.
- `WORKSPACE_MASTER_EMAIL` is the real Supabase Auth email for that admin account.
- If `WORKSPACE_MASTER_EMAIL` is omitted, the first email in `WORKSPACE_ADMIN_EMAILS` is used.

## 3. Auth model

This workspace now uses Supabase Auth, not Netlify Identity.

- Creator login input: `creators.id` + that creator's Supabase Auth password
- Creator route: `/workspace/{creator_id}`
- Creator email mapping: `creators.login_email`
- Admin login input: `WORKSPACE_MASTER_LOGIN_ID` + the admin user's Supabase Auth password
- Admin session rights: creator workspace access plus the existing `/admin` console

## 4. Creator records

Each creator row should use a route-safe `id` because that same value is:

- the workspace URL segment
- the creator login ID shown in the popup

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

You must also create a matching Supabase Auth user for `chaehee@example.com` and set that user's password.

## 5. Admin account

The master admin must exist in both places:

1. Supabase Auth user
2. `admin_users` table

Example bootstrap:

```sql
insert into admin_users (user_id, email)
values ('<auth-user-uuid>', 'admin@example.com');
```

Then set:

```bash
WORKSPACE_MASTER_LOGIN_ID=admin
WORKSPACE_MASTER_EMAIL=admin@example.com
```

## 6. Access model

- Creator users can only open their own workspace.
- Admin users can open every creator workspace and switch creators from the sidebar.
- All workspace reads/writes still go through Netlify Functions, which enforce the `creator_id` permission check before touching Supabase.

## 7. Routes and files

- Public CTA: `Creator Workspace` button in the hero section
- Admin login: `/admin`
- Workspace routes: `/workspace` and `/workspace/[creatorId]`
- Static UI modules: `/public/workspace/*` and `/public/components/*`

## 8. Attachment flow

1. Browser requests a signed upload token from `/.netlify/functions/workspace-upload`
2. Browser uploads the file directly to Supabase Storage with the signed token
3. Browser registers metadata through `/.netlify/functions/workspace-save`
4. Workspace reads signed download URLs from `/.netlify/functions/workspace-data`
