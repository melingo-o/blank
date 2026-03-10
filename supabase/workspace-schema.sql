create extension if not exists "pgcrypto";

do $$
begin
  if not exists (select 1 from pg_type where typname = 'workspace_meeting_type') then
    create type workspace_meeting_type as enum ('kickoff', 'concept', 'content', 'script_feedback');
  end if;

  if not exists (select 1 from pg_type where typname = 'workspace_content_status') then
    create type workspace_content_status as enum ('idea', 'script', 'filming', 'editing', 'published');
  end if;

  if not exists (select 1 from pg_type where typname = 'workspace_attachment_kind') then
    create type workspace_attachment_kind as enum ('thumbnail', 'script', 'pdf_note', 'reference');
  end if;
end $$;

create or replace function workspace_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create table if not exists creators (
  id text primary key,
  auth_user_id uuid unique references auth.users(id) on delete set null,
  name text not null,
  channel_name text not null,
  channel_concept text,
  join_date date not null,
  channel_url text,
  login_email text unique,
  total_views bigint not null default 0,
  subscribers_gained integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table creators add column if not exists auth_user_id uuid unique references auth.users(id) on delete set null;

create table if not exists meetings (
  id uuid primary key default gen_random_uuid(),
  creator_id text not null references creators(id) on delete cascade,
  meeting_type workspace_meeting_type not null,
  date date not null,
  summary text not null,
  notes text,
  created_by text,
  created_at timestamptz not null default now()
);

create table if not exists contents (
  id uuid primary key default gen_random_uuid(),
  creator_id text not null references creators(id) on delete cascade,
  title text not null,
  concept text,
  script text,
  thumbnail_url text,
  status workspace_content_status not null default 'idea',
  publish_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists feedback (
  id uuid primary key default gen_random_uuid(),
  content_id uuid not null references contents(id) on delete cascade,
  author text not null,
  author_role text,
  comment text not null,
  created_at timestamptz not null default now()
);

create table if not exists milestones (
  id uuid primary key default gen_random_uuid(),
  creator_id text not null references creators(id) on delete cascade,
  title text not null,
  description text,
  date date not null,
  created_at timestamptz not null default now()
);

create table if not exists attachments (
  id uuid primary key default gen_random_uuid(),
  creator_id text not null references creators(id) on delete cascade,
  content_id uuid references contents(id) on delete cascade,
  meeting_id uuid references meetings(id) on delete cascade,
  title text,
  file_name text not null,
  file_type text,
  kind workspace_attachment_kind not null default 'reference',
  storage_bucket text not null default 'creator-workspace',
  storage_path text not null,
  uploaded_by text,
  created_at timestamptz not null default now()
);

create index if not exists idx_meetings_creator_id on meetings (creator_id, date desc);
create index if not exists idx_contents_creator_id on contents (creator_id, status, updated_at desc);
create index if not exists idx_feedback_content_id on feedback (content_id, created_at desc);
create index if not exists idx_milestones_creator_id on milestones (creator_id, date asc);
create index if not exists idx_attachments_creator_id on attachments (creator_id, created_at desc);
create index if not exists idx_creators_auth_user_id on creators (auth_user_id);

drop trigger if exists creators_workspace_updated_at on creators;
create trigger creators_workspace_updated_at
before update on creators
for each row execute function workspace_set_updated_at();

drop trigger if exists contents_workspace_updated_at on contents;
create trigger contents_workspace_updated_at
before update on contents
for each row execute function workspace_set_updated_at();
