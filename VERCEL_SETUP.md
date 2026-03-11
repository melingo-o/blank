# Vercel Setup

## 1. Import the repository

1. Open Vercel
2. Add New Project
3. Import `melingo-o/blank`
4. Keep the project root as this `web` directory if Vercel asks for a subdirectory

## 2. Add environment variables

Add these variables in the Vercel project settings for `Production`, `Preview`, and `Development`.

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
WORKSPACE_STORAGE_BUCKET=creator-workspace
WORKSPACE_ADMIN_EMAILS=
WORKSPACE_MASTER_LOGIN_ID=admin
WORKSPACE_MASTER_EMAIL=
```

## 3. Deploy

1. Trigger the first deployment
2. After deploy completes, open:
   - `/`
   - `/admin`
   - `/workspace`

## 4. Notes

- The app now supports Vercel Route Handlers under `/api/*`
- Existing frontend calls to `/.netlify/functions/*` are preserved through a Next.js rewrite to `/api/*`
- `netlify.toml` can stay in the repo; Vercel ignores it
