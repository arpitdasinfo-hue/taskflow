# TaskFlow Memory

## Project Overview
- React 19 + Zustand + Tailwind CSS + glass morphism dark PWA
- Worktree: `.claude/worktrees/sad-beaver` (branch: `claude/sad-beaver`)
- Dev server: `npm run dev` at port 5173 (use `preview_start` with name "taskflow-dev")

## Architecture
- **Hierarchy**: Programs → Projects → Sub-projects → Tasks
- **Stores**: useTaskStore (v3), useProjectStore (v3), useSettingsStore (v2)
- **Pages**: dashboard, tasks, today, projects, program-dashboard, timeline, settings

## Program Management Feature (completed in sad-beaver worktree)
All Tier 1, 2, 3 (CSV/PDF) features implemented. See details.md for full list.

## Key File Paths
- Pages: `src/pages/` (Dashboard, Tasks, Today, Projects, ProgramDashboard, Timeline, Settings)
- Stores: `src/store/useTaskStore.js`, `useProjectStore.js`, `useSettingsStore.js`
- Hooks: `src/hooks/useFilteredTasks.js`, `useProgramStats.js`, `useBlockedTasks.js`
- Components: `src/components/tasks/`, `projects/`, `common/`, `layout/`, `settings/`

## Important Patterns
- Read file before Write/Edit (enforced by tool)
- Store versions: migrations are chained (v1→v2→v3)
- `selectedTaskIds` and `selectedTaskId` are NOT persisted to localStorage
- Program filter and project filter are mutually exclusive
- Sub-projects use `parentId` on Project model (flat array)

## User Preferences
- Concise responses, no emojis
- Glass morphism design language — match existing visual style exactly
