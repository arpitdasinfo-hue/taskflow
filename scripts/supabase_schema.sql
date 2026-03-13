create extension if not exists pgcrypto;

create table if not exists workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'My Workspace',
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

create table if not exists workspace_members (
  workspace_id uuid references workspaces(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  role text not null default 'owner',
  joined_at timestamptz default now(),
  primary key (workspace_id, user_id)
);

create table if not exists programs (
  id text primary key,
  workspace_id uuid references workspaces(id) on delete cascade,
  name text not null,
  color text,
  description text,
  status text default 'planning',
  start_date text,
  end_date text,
  created_by uuid references auth.users(id),
  created_at text,
  updated_at timestamptz default now()
);

create table if not exists projects (
  id text primary key,
  workspace_id uuid references workspaces(id) on delete cascade,
  program_id text references programs(id) on delete set null,
  parent_id text references projects(id) on delete cascade,
  name text not null,
  color text,
  description text,
  status text default 'active',
  start_date text,
  due_date text,
  created_by uuid references auth.users(id),
  created_at text,
  updated_at timestamptz default now()
);

create table if not exists milestones (
  id text primary key,
  project_id text references projects(id) on delete cascade,
  name text not null,
  description text,
  due_date text,
  status text default 'pending',
  completed boolean default false,
  created_at text
);

create table if not exists tasks (
  id text primary key,
  workspace_id uuid references workspaces(id) on delete cascade,
  program_id text references programs(id) on delete set null,
  project_id text references projects(id) on delete set null,
  title text not null,
  description text,
  status text default 'todo',
  priority text default 'medium',
  start_date text,
  due_date text,
  tags text[] default '{}',
  depends_on text[] default '{}',
  created_by uuid references auth.users(id),
  created_at text,
  updated_at timestamptz default now(),
  deleted_at timestamptz
);

alter table tasks add column if not exists program_id text references programs(id) on delete set null;
alter table tasks add column if not exists deleted_at timestamptz;

create table if not exists subtasks (
  id text primary key,
  task_id text references tasks(id) on delete cascade,
  title text not null,
  completed boolean default false,
  created_at text
);

create table if not exists notes (
  id text primary key,
  task_id text references tasks(id) on delete cascade,
  content text not null,
  created_by uuid references auth.users(id),
  created_at text,
  updated_at text
);

create table if not exists share_links (
  id uuid primary key default gen_random_uuid(),
  token text unique not null default encode(gen_random_bytes(16), 'hex'),
  resource_type text not null,
  resource_id text not null,
  workspace_id uuid references workspaces(id) on delete cascade,
  access_mode text not null default 'view',
  name text,
  config jsonb not null default '{}'::jsonb,
  disabled boolean not null default false,
  revoked_at timestamptz,
  last_viewed_at timestamptz,
  created_by uuid references auth.users(id),
  expires_at timestamptz,
  created_at timestamptz default now()
);

alter table share_links add column if not exists workspace_id uuid references workspaces(id) on delete cascade;
alter table share_links add column if not exists access_mode text not null default 'view';
alter table share_links add column if not exists name text;
alter table share_links add column if not exists config jsonb not null default '{}'::jsonb;
alter table share_links add column if not exists disabled boolean not null default false;
alter table share_links add column if not exists revoked_at timestamptz;
alter table share_links add column if not exists last_viewed_at timestamptz;

create table if not exists share_view_events (
  id uuid primary key default gen_random_uuid(),
  share_link_id uuid references share_links(id) on delete cascade,
  token text not null,
  viewed_at timestamptz default now(),
  user_agent text
);

create index if not exists idx_share_links_workspace_id on share_links(workspace_id);
create index if not exists idx_share_links_created_by on share_links(created_by);
create index if not exists idx_share_links_resource on share_links(resource_type, resource_id);
create index if not exists idx_share_view_events_link on share_view_events(share_link_id);
create index if not exists idx_tasks_workspace_deleted_at on tasks(workspace_id, deleted_at);
