# TaskFlow Memory

This file is the working memory for TaskFlow. It should help future sessions keep the product direction, architecture, and recent implementation decisions intact without re-discovering them from scratch.

## Project Snapshot

- Product: TaskFlow
- Type: React 19 + Vite PWA
- Styling: Tailwind utilities plus app theme tokens
- State: Zustand stores with `persist` and `immer`
- Backend: Supabase auth, database, and realtime
- Deployment: Vercel production
- Main production alias: `https://taskflow-arpit.vercel.app`

## Product Intent

TaskFlow is an operational planning workspace for structured work across:

- programs
- projects
- sub-projects
- tasks
- subtasks
- milestones
- planner commitments
- analytics/review
- gantt scheduling
- shareable leadership views

The app should feel business-ready, dense, calm, and fast. The product preference is to simplify visible UI before adding more visible features.

## Core Product Rules

- Professional and personal work are distinct scopes.
- Personal work stays private and should not leak into sharing flows.
- Professional work can participate in sharing and leadership views.
- Pages should stay opinionated and not collapse into one another.
- Summary numbers should drill into underlying data whenever practical.
- Decorative UI should be kept to a minimum.

## Page Responsibilities

Each major page has a primary job:

- `Dashboard`: pressure check and action routing
- `Tasks`: dense execution surface
- `Planner`: commitment and sequencing
- `Programs`: structure, hierarchy, milestones, and delivery actions
- `Timeline`: schedule management and gantt/risk review
- `Activity`: recent changes and operational visibility
- `Trash`: recovery surface
- `Settings`: admin/config/export/share setup
- `ShareView`: presentation-ready external or leadership surface

Do not let one page absorb the role of another without a strong reason.

## Current Navigation Model

Navigation was standardized recently so the app uses the same page language everywhere:

- `Dashboard`
- `Tasks`
- `Planner`
- `Programs`
- `Timeline`
- `Activity`
- `Trash`
- `Settings`

Important recent UI decision:

- mobile navigation no longer horizontally scrolls
- mobile now shows 5 primary destinations plus a `More` tray
- secondary destinations in `More`: `Activity`, `Trash`, `Settings`

Shared navigation config lives in [src/components/layout/navigationConfig.js](/Users/arpitdas/Documents/New%20project/Taskflow/src/components/layout/navigationConfig.js:1).

## Repo Shape

The codebase generally follows this structure:

- `src/pages/`: screen-level composition
- `src/components/`: reusable UI by domain
- `src/store/`: Zustand state and domain actions
- `src/hooks/`: derived view/data hooks
- `src/lib/`: integrations, shaping, scope rules, helpers

Important directories:

- `src/components/layout`: shell, sidebar, bottom nav, header
- `src/components/tasks`: task table, cards, detail drawer, filters
- `src/components/projects`: program/project/milestone UI
- `src/components/settings`: export and shared-view setup
- `src/components/timeline`: gantt controls and timeline pieces

## Runtime Architecture

The app bootstraps through [src/App.jsx](/Users/arpitdas/Documents/New%20project/Taskflow/src/App.jsx:1).

Key app-level behavior:

- lazy-loads major pages
- uses a top-level auth gate
- subscribes to Supabase realtime
- surfaces sync and PWA update banners
- renders shared shell pieces like sidebar, bottom nav, task detail, quick add, toast, and command palette

## State Model

The app is store-driven. Important stores include:

- `useSettingsStore`: page state, filters, active program/project, gantt config, task views, theme, density, workspace scope
- `useTaskStore`: tasks, trash, task CRUD, sync
- `useProjectStore`: programs, projects, milestones, hierarchy CRUD, sync
- `usePlanningStore`: planner commitments and sync
- `useWorkspaceStore`: workspace resolution/loading
- `useAuthStore`: session and auth state

Important settings state details:

- `workspaceViewScope` controls whether the app is currently showing `professional` or `personal`
- `activeProgramId` and `activeProjectId` drive focused navigation and drilldown behavior
- `ganttConfig` is persisted and acts as the shared timeline filter model

See [src/store/useSettingsStore.js](/Users/arpitdas/Documents/New%20project/Taskflow/src/store/useSettingsStore.js:1).

## Data Model

Hierarchy:

- workspace
- program
- project
- sub-project
- task
- subtask
- milestone

Important relationship notes:

- milestones belong to projects
- tasks can be linked to milestones without ceasing to be tasks
- tasks may exist directly under a program with no `projectId`
- sub-projects are nested through `parentId`
- dependencies should resolve to human-readable task names in UI, not raw IDs where users scan data

## Workspace Scope Model

There are two workspace scopes:

- `professional`
- `personal`

Scope logic matters a lot. The app should not silently misclassify records when parent entities are temporarily missing.

Important rules:

- programs own explicit scope
- projects inherit from their program when attached, otherwise use their own fallback scope
- tasks inherit through program/project resolution when possible, otherwise use task/project fallback scope
- milestones are visible only when their owning project is in-scope

Scope utilities live in [src/lib/workspaceScope.js](/Users/arpitdas/Documents/New%20project/Taskflow/src/lib/workspaceScope.js:1), and scoped data is assembled through [src/hooks/useWorkspaceScopedData.js](/Users/arpitdas/Documents/New%20project/Taskflow/src/hooks/useWorkspaceScopedData.js:1).

## Auth, Backend, and Sync

TaskFlow uses Supabase for:

- email OTP auth
- persisted session storage
- database reads/writes
- realtime subscriptions

Supabase client setup lives in [src/lib/supabase.js](/Users/arpitdas/Documents/New%20project/Taskflow/src/lib/supabase.js:1).

Required env vars:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Important operational note from prior recovery work:

- if auth suddenly fails with `Invalid API key`, verify the anon key value exactly
- a malformed value with a trailing literal `\n` broke login before

## Sharing Model

Sharing is for professional data only.

Shared views are configurable by module and filters. Current shared modules include:

- summary
- portfolio
- delivery
- watchlist
- milestones
- timeline
- dependency signals

Share config defaults and status helpers live in [src/lib/share.js](/Users/arpitdas/Documents/New%20project/Taskflow/src/lib/share.js:1).

Language preference:

- keep shared surfaces presentation-ready
- avoid overly internal terms when a more neutral label exists

## Export Model

Export is a meaningful workflow in this app and should be treated like a product surface, not just a utility.

Current export capabilities:

- CSV
- printable PDF/HTML
- Excel workbook export

Export implementation lives in [src/components/settings/ExportModal.jsx](/Users/arpitdas/Documents/New%20project/Taskflow/src/components/settings/ExportModal.jsx:1).

Important current export behavior:

- workbook export supports sheet-wise program detail output
- each program can get its own worksheet with overview, project structure, milestones, tasks, and optional subtasks
- project-scoped export now includes descendant sub-project work
- program rollups now include direct program tasks
- Excel-only controls are hidden unless workbook export is selected

Important technical note:

- the workbook builder is XML spreadsheet based, not a true `.xlsx` generator yet
- upgrading to real `.xlsx` is still a worthwhile future improvement

## UX Direction

The app should feel:

- compact
- operational
- premium but restrained
- calm under heavy information density

Working heuristics:

- prefer rows for operational objects
- reserve cards for signals and summaries
- reduce chip and badge clutter aggressively
- keep headers slim
- make drilldowns obvious
- keep mobile first-class, not merely tolerated

## Recent Product/UI Decisions

These decisions are current and should be preserved unless there is a deliberate redesign:

- `Dashboard` is the review surface, not the place to manage structure
- `Programs` is the structure surface, not a second analytics dashboard
- `Tasks` should stay dense and execution-first
- `Planner` should reuse task language rather than inventing a completely different visual grammar
- `Timeline` should stay useful for schedule/risk review, with hierarchy kept visible where practical

Recent shipped simplifications:

- shared navigation naming was standardized across sidebar, mobile nav, header, and command palette
- mobile nav was simplified into primary destinations plus `More`
- dense program headers were softened on smaller screens by allowing wrap and tighter mobile signal layout

## Motion Direction

Motion should be helpful, fast, and restrained.

Good uses:

- page transitions
- drawer open/close
- active nav state
- workspace scope switch
- expand/collapse surfaces
- planner commit interactions

Avoid:

- slow flourish for its own sake
- bounce-heavy motion
- over-animating dense data surfaces

Shared motion helpers live in `src/lib/motion.js`.

## Known Technical Notes

- production builds are healthy
- the main bundle still throws a large chunk warning during `pnpm build`
- further code-splitting is still worthwhile
- local folders like `artifacts/` and `test-results/` are usually not intended for commit
- the root `README.md` is still mostly the default Vite template and does not reflect the real app yet

## Practical Workflow Notes

When working on this repo:

- read this file with `AGENTS.md`
- preserve page responsibilities
- avoid mixing unrelated local WIP into commits
- prefer incremental, reviewable changes
- run `pnpm build` before wrapping work
- be careful with scope logic, export logic, and shared view language

## Good Next Improvements

These are sensible next-step improvements if no higher-priority product ask overrides them:

- replace the default `README.md` with a real project overview
- upgrade Excel export from XML workbook output to true `.xlsx`
- simplify the top of the `Tasks` page further by reducing visible filter/action density on mobile
- promote export to a more first-class action instead of leaving it buried in `Settings`
- continue bundle splitting for the heavy client entry

