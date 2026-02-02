-- Supabase schema for admin dashboard + submissions
create extension if not exists "pgcrypto";

create type submission_type as enum ('apply', 'business');
create type submission_status as enum ('new', 'reviewed', 'archived');

create table if not exists admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text,
  created_at timestamptz not null default now()
);

create table if not exists portfolio_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  niche text not null,
  followers text not null,
  growth text not null,
  image_url text not null,
  instagram_handle text,
  is_visible boolean not null default true,
  order_index integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists team_members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  nickname text not null,
  role text not null,
  focus text not null,
  order_index integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists submissions (
  id uuid primary key default gen_random_uuid(),
  type submission_type not null,
  name text,
  phone text,
  sns text,
  intro text,
  company text,
  contact text,
  budget text,
  details text,
  status submission_status not null default 'new',
  created_at timestamptz not null default now()
);

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger portfolio_items_updated_at
before update on portfolio_items
for each row execute function set_updated_at();

create trigger team_members_updated_at
before update on team_members
for each row execute function set_updated_at();

alter table admin_users enable row level security;
alter table portfolio_items enable row level security;
alter table team_members enable row level security;
alter table submissions enable row level security;

-- Admins can read their own admin row
create policy "admin_users_self_read"
on admin_users for select
to authenticated
using (user_id = auth.uid());

-- Public read for portfolio/team
create policy "portfolio_public_read"
on portfolio_items for select
to anon, authenticated
using (true);

create policy "team_public_read"
on team_members for select
to anon, authenticated
using (true);

-- Admin-only write for portfolio/team
create policy "portfolio_admin_write"
on portfolio_items for all
to authenticated
using (exists (select 1 from admin_users where user_id = auth.uid()))
with check (exists (select 1 from admin_users where user_id = auth.uid()));

create policy "team_admin_write"
on team_members for all
to authenticated
using (exists (select 1 from admin_users where user_id = auth.uid()))
with check (exists (select 1 from admin_users where user_id = auth.uid()));

-- Allow anyone to submit
create policy "submissions_public_insert"
on submissions for insert
to anon, authenticated
with check (true);

-- Admin can manage submissions
create policy "submissions_admin_select"
on submissions for select
to authenticated
using (exists (select 1 from admin_users where user_id = auth.uid()));

create policy "submissions_admin_update"
on submissions for update
to authenticated
using (exists (select 1 from admin_users where user_id = auth.uid()))
with check (exists (select 1 from admin_users where user_id = auth.uid()));

create policy "submissions_admin_delete"
on submissions for delete
to authenticated
using (exists (select 1 from admin_users where user_id = auth.uid()));

-- Bootstrap: insert your admin user after creating in Supabase Auth
-- insert into admin_users (user_id, email) values ('<auth-user-uuid>', 'you@example.com');
