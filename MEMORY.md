# TaskFlow Memory

This file is a working memory for the app and the product decisions made across implementation sessions. It is meant to help future work stay consistent without re-learning the same context repeatedly.

## Product Intent

TaskFlow is a planning and execution workspace for structured work:

- professional work that can be shared
- personal work that stays private
- programs, projects, sub-projects, tasks, milestones, dependencies, planner commitments, analytics, and gantt scheduling

The product direction favors:

- compact, operational UI
- fewer decorative cards and chips
- strong drilldowns from summary to underlying data
- premium but restrained motion
- clear separation between structure, execution, planning, review, and schedule views

## Page Roles

The app works best when each page has a single job:

- `Dashboard`: attention and action
- `Programs`: structure and delivery hierarchy
- `All Tasks`: dense execution surface
- `Planner`: commitment and sequencing
- `Analytics`: review and drilldown
- `Gantt`: timeline and schedule management
- `Share View`: leadership/external review surface

Avoid letting one page absorb the responsibilities of another.

## Data Model Context

### Hierarchy

- workspace
- program
- project
- sub-project
- task
- subtask
- milestone

### Important relationships

- milestones belong to projects
- a task can also be linked to a milestone
- a milestone may exist independently without requiring a task
- dependencies should resolve to task names in UI, not raw IDs

### Planner behavior

- tasks auto-flow into week/month based on start date windows
- today is still a deliberate pull from week/month
- planner items remain until the task is marked done

## Workspace Model

There are two workspace scopes:

- `professional`
- `personal`

Rules:

- personal data is private and not shareable
- professional data can participate in sharing flows
- standalone tasks and projects must persist their own scope
- scope resolution must never silently fall back to `professional` if parent entities are temporarily missing

## Sharing Model

- shared views are for professional data only
- shared task tables should show dependency task names, not IDs
- leadership/shared views should use neutral language rather than internal terms like `manager` or `read-only`

## UI / UX Decisions Already Made

### General

- prefer compact surfaces over stacked dashboard cards
- use rows for operational objects; reserve cards for summary/signals
- reduce chip count aggressively
- every meaningful number should open the related data when possible
- use one consistent task table language across `All Tasks`, `Planner`, and shared task lists

### Programs

- page has been simplified to a more compact hierarchy view
- only one program should feel active/open at a time
- milestone sections should be compressed and summary-first
- project rows should be dense and neutral, not visually overloaded

### All Tasks

- dense execution-first layout
- inline editing for start, due, status, priority
- right-side arrow opens task detail
- project dropdown should not repeat the program name when program scope is already selected

### Planner

- candidate pool should match the `All Tasks` list/table language
- horizontal segregation for `Today`, `This Week`, `This Month`
- no heavy board-style clutter

### Analytics

- review-first surface
- top numbers and signal cards should drill into the actual data
- avoid decorative summary blocks that do not lead anywhere

### Gantt

- compact toolbar
- fullscreen supported
- internal chart scrolling required
- keep contextual hierarchy visible where possible instead of hiding too aggressively

### Milestones

- tasks can be linked to milestones without ceasing to be tasks
- milestones need add, edit, complete, delete flows
- program milestone sections are rollups of project milestones

## Motion Design Direction

Motion should feel premium and helpful, not flashy.

Desired qualities:

- smooth
- layered
- restrained
- fast
- functional

Best use of motion:

- page transitions
- sidebar active state and workspace toggle
- drawer open/close
- list insert/remove
- planner commit motion
- gantt fullscreen and expand/collapse

Avoid:

- bounce-heavy animation
- slow decorative transitions
- animating everything equally

## Engineering Standards

- shared UI primitives should live in reusable components
- avoid repeating scope logic per page
- use optimistic updates with rollback/error visibility for Supabase writes
- keep state normalized and ID-driven
- shared tables and drawers should use common presentation logic
- build for sync correctness across refreshes and devices

## Known Product Preferences Collected From Working Sessions

- cleaner, simpler UI with the same feature set
- reduce clutter before adding visible features
- maintain dense, business-ready workflows
- keep personal and professional work separate
- keep leadership/shared views polished and presentation-ready
- make interactions discoverable with fewer visible controls

## Known Technical Notes

- the project has historically had large main bundle warnings during build
- build has been healthy, but chunk splitting is still a worthwhile future optimization
- `artifacts/` and `test-results/` are often local-only and should not be included casually

## Agent Workflow Notes

When continuing work on this repo:

- read this file together with `AGENTS.md`
- preserve current product roles per page
- prefer incremental, reviewable refactors
- be careful not to mix unrelated local WIP into commits
- when adding new summary numbers or cards, make them actionable where the data exists
