# Supabase Setup

1) Create a Supabase project and copy:
- `Project URL`
- `anon public key`

2) Add to `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

3) Run `supabase/schema.sql` in the Supabase SQL editor.

4) Create an admin user in Supabase Auth (email/password).

5) Insert the admin user id into `admin_users`:
```
insert into admin_users (user_id, email)
values ('<auth-user-uuid>', 'admin@example.com');
```

6) Enable Realtime on tables if disabled:
- `portfolio_items`
- `team_members`
- `submissions`

7) Storage 버킷 생성 (이미지 업로드용):
- Supabase 콘솔 > Storage > Create bucket
- 이름: `influencer-images`
- Public bucket: ON

그리고 아래 정책을 SQL Editor에 실행:
```
create policy "portfolio images insert"
on storage.objects for insert
to authenticated
with check (bucket_id = 'influencer-images');

create policy "portfolio images update"
on storage.objects for update
to authenticated
using (bucket_id = 'influencer-images');

create policy "portfolio images delete"
on storage.objects for delete
to authenticated
using (bucket_id = 'influencer-images');
```

8) (옵션) 초기 데이터 시드:
```
SUPABASE_URL=your-project-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
npm run seed:supabase
```
기존 데이터를 덮어쓰려면:
```
npm run seed:supabase -- --force
```

After this, visit `/admin` to log in.
