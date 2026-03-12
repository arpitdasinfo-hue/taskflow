alter table workspaces enable row level security;
alter table workspace_members enable row level security;
alter table programs enable row level security;
alter table projects enable row level security;
alter table milestones enable row level security;
alter table tasks enable row level security;
alter table subtasks enable row level security;
alter table notes enable row level security;
alter table share_links enable row level security;
alter table share_view_events enable row level security;

drop policy if exists "own membership" on workspace_members;
create policy "own membership" on workspace_members for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "workspace access" on workspaces;
drop policy if exists "workspace read" on workspaces;
drop policy if exists "workspace insert" on workspaces;
drop policy if exists "workspace update" on workspaces;
drop policy if exists "workspace delete" on workspaces;

create policy "workspace read" on workspaces for select
  using (
    created_by = auth.uid()
    or id in (select workspace_id from workspace_members where user_id = auth.uid())
  );

create policy "workspace insert" on workspaces for insert
  with check (created_by = auth.uid());

create policy "workspace update" on workspaces for update
  using (id in (select workspace_id from workspace_members where user_id = auth.uid()))
  with check (id in (select workspace_id from workspace_members where user_id = auth.uid()));

create policy "workspace delete" on workspaces for delete
  using (created_by = auth.uid());

drop policy if exists "programs access" on programs;
create policy "programs access" on programs for all
  using (workspace_id in (select workspace_id from workspace_members where user_id = auth.uid()))
  with check (workspace_id in (select workspace_id from workspace_members where user_id = auth.uid()));

drop policy if exists "projects access" on projects;
create policy "projects access" on projects for all
  using (workspace_id in (select workspace_id from workspace_members where user_id = auth.uid()))
  with check (workspace_id in (select workspace_id from workspace_members where user_id = auth.uid()));

drop policy if exists "tasks access" on tasks;
create policy "tasks access" on tasks for all
  using (workspace_id in (select workspace_id from workspace_members where user_id = auth.uid()))
  with check (workspace_id in (select workspace_id from workspace_members where user_id = auth.uid()));

drop policy if exists "milestones access" on milestones;
create policy "milestones access" on milestones for all
  using (
    project_id in (
      select id
      from projects
      where workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
    )
  )
  with check (
    project_id in (
      select id
      from projects
      where workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
    )
  );

drop policy if exists "subtasks access" on subtasks;
create policy "subtasks access" on subtasks for all
  using (
    task_id in (
      select id
      from tasks
      where workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
    )
  )
  with check (
    task_id in (
      select id
      from tasks
      where workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
    )
  );

drop policy if exists "notes access" on notes;
create policy "notes access" on notes for all
  using (
    task_id in (
      select id
      from tasks
      where workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
    )
  )
  with check (
    task_id in (
      select id
      from tasks
      where workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
    )
  );

drop policy if exists "share_links public read" on share_links;
create policy "share_links public read" on share_links for select
  using (true);

drop policy if exists "share_links owner write" on share_links;
drop policy if exists "share_links owner insert" on share_links;
create policy "share_links owner insert" on share_links for insert
  with check (
    created_by = auth.uid()
    and access_mode = 'view'
    and (
      workspace_id is null
      or workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
    )
  );

drop policy if exists "share_links owner update" on share_links;
create policy "share_links owner update" on share_links for update
  using (created_by = auth.uid())
  with check (
    created_by = auth.uid()
    and access_mode = 'view'
    and (
      workspace_id is null
      or workspace_id in (select workspace_id from workspace_members where user_id = auth.uid())
    )
  );

drop policy if exists "share_links owner delete" on share_links;
create policy "share_links owner delete" on share_links for delete
  using (created_by = auth.uid());

drop policy if exists "share_view_events insert" on share_view_events;
create policy "share_view_events insert" on share_view_events for insert
  with check (true);

drop policy if exists "share_view_events owner read" on share_view_events;
create policy "share_view_events owner read" on share_view_events for select
  using (
    exists (
      select 1
      from share_links sl
      where sl.id = share_view_events.share_link_id
        and sl.created_by = auth.uid()
    )
  );

-- Public read access for shared dashboards.
drop policy if exists "programs shared read" on programs;
create policy "programs shared read" on programs for select
  using (
    exists (
      select 1
      from share_links sl
      where sl.access_mode = 'view'
        and coalesce(sl.disabled, false) = false
        and sl.revoked_at is null
        and (sl.expires_at is null or sl.expires_at > now())
        and (
          (sl.resource_type = 'program' and sl.resource_id = programs.id)
          or (sl.resource_type = 'workspace' and sl.workspace_id = programs.workspace_id)
        )
    )
  );

drop policy if exists "projects shared read" on projects;
create policy "projects shared read" on projects for select
  using (
    exists (
      select 1
      from share_links sl
      where sl.access_mode = 'view'
        and coalesce(sl.disabled, false) = false
        and sl.revoked_at is null
        and (sl.expires_at is null or sl.expires_at > now())
        and (
          (sl.resource_type = 'project' and sl.resource_id = projects.id)
          or (sl.resource_type = 'program' and sl.resource_id = projects.program_id)
          or (sl.resource_type = 'workspace' and sl.workspace_id = projects.workspace_id)
        )
    )
  );

drop policy if exists "tasks shared read" on tasks;
create policy "tasks shared read" on tasks for select
  using (
    exists (
      select 1
      from share_links sl
      where sl.access_mode = 'view'
        and coalesce(sl.disabled, false) = false
        and sl.revoked_at is null
        and (sl.expires_at is null or sl.expires_at > now())
        and (
          (sl.resource_type = 'workspace' and sl.workspace_id = tasks.workspace_id)
          or (sl.resource_type = 'project' and sl.resource_id = tasks.project_id)
          or (
            sl.resource_type = 'program'
            and exists (
              select 1
              from projects p
              where p.id = tasks.project_id
                and p.program_id = sl.resource_id
            )
          )
        )
    )
  );

drop policy if exists "milestones shared read" on milestones;
create policy "milestones shared read" on milestones for select
  using (
    exists (
      select 1
      from projects p
      join share_links sl on (
        (sl.resource_type = 'project' and sl.resource_id = p.id)
        or (sl.resource_type = 'program' and sl.resource_id = p.program_id)
        or (sl.resource_type = 'workspace' and sl.workspace_id = p.workspace_id)
      )
      where p.id = milestones.project_id
        and sl.access_mode = 'view'
        and coalesce(sl.disabled, false) = false
        and sl.revoked_at is null
        and (sl.expires_at is null or sl.expires_at > now())
    )
  );
