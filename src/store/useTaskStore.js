import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { nanoid } from 'nanoid'

const now  = () => new Date().toISOString()
const days = (n) => new Date(Date.now() + n * 86400000).toISOString()

/** ── Program Management Demo Data ───────────────────────────────────────── */
const SAMPLE_TASKS = [
  // Engineering ──────────────────────────────────────────────────────────────
  {
    id: 'task-1', projectId: 'proj-eng',
    title: 'Implement OAuth 2.0 (Google + GitHub)',
    description: 'Integrate social login via OAuth 2.0. Covers token exchange, refresh, and session management. Must be PKCE-compliant.',
    status: 'in-progress', priority: 'critical',
    dueDate: days(3), tags: ['auth', 'backend', 'security'],
    dependsOn: [],
    createdAt: now(), updatedAt: now(),
    subtasks: [
      { id: nanoid(), title: 'Register OAuth apps on Google & GitHub consoles', completed: true,  createdAt: now() },
      { id: nanoid(), title: 'Implement PKCE flow in auth middleware',           completed: true,  createdAt: now() },
      { id: nanoid(), title: 'Token refresh & session expiry handling',          completed: false, createdAt: now() },
      { id: nanoid(), title: 'Unit tests for all auth edge cases',               completed: false, createdAt: now() },
      { id: nanoid(), title: 'Security audit & penetration test',                completed: false, createdAt: now() },
    ],
    notes: [
      { id: nanoid(), content: 'GitHub OAuth approved. Google pending — submitted for review 2 days ago.', createdAt: now(), updatedAt: now() },
      { id: nanoid(), content: 'Security team requires PKCE — standard password grant not acceptable.',    createdAt: now(), updatedAt: now() },
    ],
  },
  {
    id: 'task-2', projectId: 'proj-eng',
    title: 'Database migration: Postgres 14 → 16',
    description: 'Upgrade production DB cluster to Postgres 16. Includes schema compatibility check, replica promotion, and zero-downtime cutover plan.',
    status: 'review', priority: 'high',
    dueDate: days(7), tags: ['database', 'infra', 'migration'],
    dependsOn: [],
    createdAt: now(), updatedAt: now(),
    subtasks: [
      { id: nanoid(), title: 'pg_upgrade dry run on staging replica',        completed: true,  createdAt: now() },
      { id: nanoid(), title: 'Test all 38 stored procedures on PG 16',       completed: true,  createdAt: now() },
      { id: nanoid(), title: 'Update PgBouncer connection pooling config',   completed: true,  createdAt: now() },
      { id: nanoid(), title: 'Write zero-downtime cutover runbook',          completed: false, createdAt: now() },
      { id: nanoid(), title: 'Rollback script and drill',                    completed: false, createdAt: now() },
    ],
    notes: [
      { id: nanoid(), content: 'All stored procedures passed on PG16 staging. Partitioned tables behave correctly.', createdAt: now(), updatedAt: now() },
    ],
  },
  {
    id: 'task-3', projectId: 'proj-eng',
    title: 'Fix memory leak in WebSocket event handler',
    description: 'Real-time feed service leaks ~12MB/hour. Heap dumps point to uncleaned listeners in the event emitter pool.',
    status: 'todo', priority: 'critical',
    dueDate: days(1), tags: ['bug', 'performance', 'backend'],
    dependsOn: ['task-2'],
    createdAt: now(), updatedAt: now(),
    subtasks: [
      { id: nanoid(), title: 'Reproduce with clinic.js heap profiler',  completed: false, createdAt: now() },
      { id: nanoid(), title: 'Identify listener registration site',     completed: false, createdAt: now() },
      { id: nanoid(), title: 'Implement proper cleanup on disconnect',  completed: false, createdAt: now() },
      { id: nanoid(), title: '24h soak test post-fix',                  completed: false, createdAt: now() },
    ],
    notes: [
      { id: nanoid(), content: 'Heap dump in Jira TF-441. Spikes coincide with high-traffic reconnect storms.', createdAt: now(), updatedAt: now() },
    ],
  },
  {
    id: 'task-4', projectId: 'proj-eng',
    title: 'Migrate REST endpoints to GraphQL',
    description: 'Phase 1: wrap existing REST controllers in GraphQL resolvers. Maintain REST for backwards-compat during transition period.',
    status: 'todo', priority: 'medium',
    dueDate: days(21), tags: ['api', 'graphql', 'backend'],
    dependsOn: [],
    createdAt: now(), updatedAt: now(),
    subtasks: [
      { id: nanoid(), title: 'Audit all current REST endpoints (48 total)',   completed: true,  createdAt: now() },
      { id: nanoid(), title: 'Design unified GraphQL schema',                 completed: false, createdAt: now() },
      { id: nanoid(), title: 'Implement resolvers for /users & /projects',    completed: false, createdAt: now() },
      { id: nanoid(), title: 'Implement resolvers for /tasks & /reports',     completed: false, createdAt: now() },
      { id: nanoid(), title: 'Add deprecation notices on legacy endpoints',   completed: false, createdAt: now() },
    ],
    notes: [],
  },
  {
    id: 'task-5', projectId: 'proj-eng',
    title: 'Set up distributed tracing (OpenTelemetry)',
    description: 'Instrument all microservices with OTel SDK. Export traces to Grafana Tempo. Goal: p99 latency visibility across service boundaries.',
    status: 'done', priority: 'high',
    dueDate: null, tags: ['observability', 'devops'],
    dependsOn: [],
    createdAt: now(), updatedAt: now(),
    subtasks: [
      { id: nanoid(), title: 'Instrument API gateway',           completed: true, createdAt: now() },
      { id: nanoid(), title: 'Instrument auth service',          completed: true, createdAt: now() },
      { id: nanoid(), title: 'Instrument notification service',  completed: true, createdAt: now() },
      { id: nanoid(), title: 'Configure Grafana Tempo backend',  completed: true, createdAt: now() },
    ],
    notes: [
      { id: nanoid(), content: 'Live in prod since last Tuesday. p99 dashboard linked in Confluence.', createdAt: now(), updatedAt: now() },
    ],
  },
  {
    id: 'task-6', projectId: 'proj-eng',
    title: 'Build notification delivery pipeline',
    description: 'Reliable multi-channel notifications: email (SES), push (FCM/APNs), in-app. Retry queue with exponential backoff.',
    status: 'blocked', priority: 'high',
    dueDate: days(14), tags: ['notifications', 'backend'],
    dependsOn: ['task-1'],
    createdAt: now(), updatedAt: now(),
    subtasks: [
      { id: nanoid(), title: 'Design notification schema & delivery contract', completed: true,  createdAt: now() },
      { id: nanoid(), title: 'SES email integration + bounce handling',        completed: false, createdAt: now() },
      { id: nanoid(), title: 'FCM & APNs push integration',                   completed: false, createdAt: now() },
      { id: nanoid(), title: 'Retry queue (SQS + DLQ)',                       completed: false, createdAt: now() },
    ],
    notes: [
      { id: nanoid(), content: 'Blocked: Apple APNs certificate renewal pending with ops team. ETA: 3 days.', createdAt: now(), updatedAt: now() },
    ],
  },

  // Design ───────────────────────────────────────────────────────────────────
  {
    id: 'task-7', projectId: 'proj-design',
    title: 'Redesign onboarding flow (v3)',
    description: 'End-to-end onboarding redesign targeting 40% improvement in Day-1 activation. 5-step progressive disclosure with contextual tooltips.',
    status: 'in-progress', priority: 'high',
    dueDate: days(5), tags: ['ux', 'onboarding', 'design'],
    dependsOn: [],
    createdAt: now(), updatedAt: now(),
    subtasks: [
      { id: nanoid(), title: 'User research synthesis (15 interviews)', completed: true,  createdAt: now() },
      { id: nanoid(), title: 'Journey map & pain point analysis',       completed: true,  createdAt: now() },
      { id: nanoid(), title: 'Wireframes — all 5 onboarding steps',    completed: true,  createdAt: now() },
      { id: nanoid(), title: 'Hi-fi Figma prototype',                  completed: false, createdAt: now() },
      { id: nanoid(), title: 'Usability test with 6 participants',     completed: false, createdAt: now() },
      { id: nanoid(), title: 'Developer handoff & spec doc',           completed: false, createdAt: now() },
    ],
    notes: [
      { id: nanoid(), content: 'Biggest drop-off at step 3 (workspace setup). Simplify to 2 fields max.', createdAt: now(), updatedAt: now() },
    ],
  },
  {
    id: 'task-8', projectId: 'proj-design',
    title: 'Build Figma component library (design system)',
    description: 'Formalize component library with design tokens, variants, and states. Goal: 100% token compliance across all surfaces.',
    status: 'in-progress', priority: 'medium',
    dueDate: days(28), tags: ['design-system', 'figma', 'tokens'],
    dependsOn: [],
    createdAt: now(), updatedAt: now(),
    subtasks: [
      { id: nanoid(), title: 'Audit existing components (240 unique)',  completed: true,  createdAt: now() },
      { id: nanoid(), title: 'Define semantic token taxonomy',         completed: true,  createdAt: now() },
      { id: nanoid(), title: 'Build atoms (36 components)',            completed: true,  createdAt: now() },
      { id: nanoid(), title: 'Build molecules (24 components)',        completed: false, createdAt: now() },
      { id: nanoid(), title: 'Build organisms (12 components)',        completed: false, createdAt: now() },
      { id: nanoid(), title: 'Document usage guidelines',             completed: false, createdAt: now() },
    ],
    notes: [
      { id: nanoid(), content: '4-tier token system: primitive → semantic → component → context.', createdAt: now(), updatedAt: now() },
    ],
  },
  {
    id: 'task-9', projectId: 'proj-design',
    title: 'Accessibility audit — WCAG 2.1 AA',
    description: 'Full product audit against WCAG 2.1 AA. Fix all blocker and critical issues before public launch.',
    status: 'review', priority: 'critical',
    dueDate: days(10), tags: ['accessibility', 'compliance'],
    dependsOn: ['task-8'],
    createdAt: now(), updatedAt: now(),
    subtasks: [
      { id: nanoid(), title: 'Automated scan (Axe) + manual checks',  completed: true,  createdAt: now() },
      { id: nanoid(), title: 'Fix 18 color contrast failures',        completed: true,  createdAt: now() },
      { id: nanoid(), title: 'Fix 11 keyboard navigation gaps',       completed: false, createdAt: now() },
      { id: nanoid(), title: 'Screen reader testing (NVDA + VO)',     completed: false, createdAt: now() },
      { id: nanoid(), title: 'Re-audit and sign-off',                 completed: false, createdAt: now() },
    ],
    notes: [
      { id: nanoid(), content: '47 issues found. 19 fixed. 28 remaining — tracked in a11y-issues.csv.', createdAt: now(), updatedAt: now() },
    ],
  },

  // Marketing ────────────────────────────────────────────────────────────────
  {
    id: 'task-10', projectId: 'proj-mktg',
    title: 'Q2 product launch campaign',
    description: 'Full-funnel GTM campaign for TaskFlow v2. Target: 5,000 signups in 30 days. Channels: SEO, paid, influencer, email.',
    status: 'in-progress', priority: 'critical',
    dueDate: days(18), tags: ['launch', 'gtm', 'campaign'],
    dependsOn: [],
    createdAt: now(), updatedAt: now(),
    subtasks: [
      { id: nanoid(), title: 'Messaging framework & ICP definition',  completed: true,  createdAt: now() },
      { id: nanoid(), title: 'Landing page copy & CTA optimization',  completed: true,  createdAt: now() },
      { id: nanoid(), title: 'Email nurture sequence (5 emails)',      completed: false, createdAt: now() },
      { id: nanoid(), title: 'Influencer outreach (20 targets)',       completed: false, createdAt: now() },
      { id: nanoid(), title: 'Paid social creative (LinkedIn + X)',    completed: false, createdAt: now() },
      { id: nanoid(), title: 'Launch day PR blast',                   completed: false, createdAt: now() },
    ],
    notes: [
      { id: nanoid(), content: 'Primary ICP: indie hackers & PMs at Series A–B startups.', createdAt: now(), updatedAt: now() },
    ],
  },
  {
    id: 'task-11', projectId: 'proj-mktg',
    title: 'SEO content calendar — Q2',
    description: '24-article plan targeting bottom-of-funnel keywords. Focus: "project management for startups" cluster.',
    status: 'todo', priority: 'medium',
    dueDate: days(12), tags: ['seo', 'content', 'organic'],
    dependsOn: [],
    createdAt: now(), updatedAt: now(),
    subtasks: [
      { id: nanoid(), title: 'Keyword research & gap analysis',       completed: true,  createdAt: now() },
      { id: nanoid(), title: 'Competitor content audit',              completed: false, createdAt: now() },
      { id: nanoid(), title: 'Draft 24-article brief',                completed: false, createdAt: now() },
      { id: nanoid(), title: 'Assign to writers + set deadlines',     completed: false, createdAt: now() },
    ],
    notes: [],
  },

  // Operations ───────────────────────────────────────────────────────────────
  {
    id: 'task-12', projectId: 'proj-ops',
    title: 'Migrate all services to Kubernetes (EKS)',
    description: 'Containerise 8 microservices and deploy to EKS. Replace bare-metal EC2. Target: 40% infra cost reduction.',
    status: 'in-progress', priority: 'high',
    dueDate: days(35), tags: ['kubernetes', 'eks', 'infra', 'devops'],
    dependsOn: [],
    createdAt: now(), updatedAt: now(),
    subtasks: [
      { id: nanoid(), title: 'Dockerise all 8 services',              completed: true,  createdAt: now() },
      { id: nanoid(), title: 'Write Helm charts for each service',    completed: true,  createdAt: now() },
      { id: nanoid(), title: 'EKS cluster provisioning (Terraform)',  completed: true,  createdAt: now() },
      { id: nanoid(), title: 'Horizontal pod autoscaling config',     completed: false, createdAt: now() },
      { id: nanoid(), title: 'Istio service mesh setup',              completed: false, createdAt: now() },
      { id: nanoid(), title: 'Load test at 10× current traffic',      completed: false, createdAt: now() },
      { id: nanoid(), title: 'Production cutover + monitoring',       completed: false, createdAt: now() },
    ],
    notes: [
      { id: nanoid(), content: 'Current burn: $8,400/mo on EC2. EKS estimate: $4,900/mo. Savings from month 2.', createdAt: now(), updatedAt: now() },
    ],
  },
  {
    id: 'task-13', projectId: 'proj-ops',
    title: 'SOC 2 Type II preparation',
    description: 'Prepare for SOC 2 Type II audit in Q3. Gap assessment, policy documentation, and evidence collection across 5 trust criteria.',
    status: 'blocked', priority: 'critical',
    dueDate: days(-2), tags: ['compliance', 'soc2', 'security'],
    dependsOn: [],
    createdAt: now(), updatedAt: now(),
    subtasks: [
      { id: nanoid(), title: 'Engage external auditor (shortlist 3)',   completed: true,  createdAt: now() },
      { id: nanoid(), title: 'Gap assessment against CC criteria',      completed: false, createdAt: now() },
      { id: nanoid(), title: 'Draft 22 security policies',              completed: false, createdAt: now() },
      { id: nanoid(), title: 'Implement access review process',         completed: false, createdAt: now() },
      { id: nanoid(), title: 'Set up evidence collection tooling',      completed: false, createdAt: now() },
    ],
    notes: [
      { id: nanoid(), content: 'BLOCKED: Legal hasn\'t signed auditor NDA. Escalated to VP Ops.', createdAt: now(), updatedAt: now() },
      { id: nanoid(), content: 'Audit window: Aug 1 – Sep 30. Hard deadline.', createdAt: now(), updatedAt: now() },
    ],
  },
  {
    id: 'task-14', projectId: 'proj-ops',
    title: 'Disaster recovery plan + runbooks',
    description: 'Document and drill full DR: primary region failure, DB failover, CDN fallback. Target RTO: 15 min, RPO: 1 min.',
    status: 'todo', priority: 'high',
    dueDate: days(20), tags: ['DR', 'runbook', 'reliability'],
    dependsOn: ['task-12'],
    createdAt: now(), updatedAt: now(),
    subtasks: [
      { id: nanoid(), title: 'Map all critical dependencies',           completed: false, createdAt: now() },
      { id: nanoid(), title: 'Document region failover procedure',      completed: false, createdAt: now() },
      { id: nanoid(), title: 'Automate DB failover with Route53',       completed: false, createdAt: now() },
      { id: nanoid(), title: 'Full DR drill with engineering team',     completed: false, createdAt: now() },
    ],
    notes: [],
  },
]

/** Check if adding depId as dependency to taskId would create a cycle */
const wouldCreateCycle = (taskId, depId, tasks) => {
  if (taskId === depId) return true
  const visited = new Set()
  const dfs = (id) => {
    if (id === taskId) return true
    if (visited.has(id)) return false
    visited.add(id)
    const t = tasks.find((t) => t.id === id)
    return (t?.dependsOn ?? []).some(dfs)
  }
  return dfs(depId)
}

const useTaskStore = create(
  persist(
    immer((set, get) => ({
      tasks: SAMPLE_TASKS,

      addTask: (data) =>
        set((state) => {
          state.tasks.unshift({
            id: nanoid(),
            projectId: data.projectId ?? null,
            title: data.title ?? 'Untitled task',
            description: data.description ?? '',
            status: data.status ?? 'todo',
            priority: data.priority ?? 'medium',
            dueDate: data.dueDate ?? null,
            tags: data.tags ?? [],
            dependsOn: data.dependsOn ?? [],
            createdAt: now(),
            updatedAt: now(),
            subtasks: [],
            notes: [],
          })
        }),

      updateTask: (id, updates) =>
        set((state) => {
          const task = state.tasks.find((t) => t.id === id)
          if (!task) return
          Object.assign(task, updates, { updatedAt: now() })
        }),

      deleteTask: (id) =>
        set((state) => {
          state.tasks = state.tasks.filter((t) => t.id !== id)
          // Remove this task from other tasks' dependsOn
          state.tasks.forEach((t) => {
            t.dependsOn = (t.dependsOn ?? []).filter((depId) => depId !== id)
          })
        }),

      // ── Dependency management ──────────────────────────────────────────────
      addDependency: (taskId, depId) =>
        set((state) => {
          const task = state.tasks.find((t) => t.id === taskId)
          if (!task) return
          if (!task.dependsOn) task.dependsOn = []
          if (task.dependsOn.includes(depId)) return
          if (wouldCreateCycle(taskId, depId, state.tasks)) return
          task.dependsOn.push(depId)
          task.updatedAt = now()
        }),

      removeDependency: (taskId, depId) =>
        set((state) => {
          const task = state.tasks.find((t) => t.id === taskId)
          if (!task) return
          task.dependsOn = (task.dependsOn ?? []).filter((id) => id !== depId)
          task.updatedAt = now()
        }),

      // ── Bulk operations ────────────────────────────────────────────────────
      bulkUpdateTasks: (ids, updates) =>
        set((state) => {
          const ts = now()
          state.tasks.forEach((task) => {
            if (ids.includes(task.id)) {
              Object.assign(task, updates, { updatedAt: ts })
            }
          })
        }),

      bulkDeleteTasks: (ids) =>
        set((state) => {
          state.tasks = state.tasks.filter((t) => !ids.includes(t.id))
          state.tasks.forEach((t) => {
            t.dependsOn = (t.dependsOn ?? []).filter((depId) => !ids.includes(depId))
          })
        }),

      // ── Subtask CRUD ────────────────────────────────────────────────────────
      addSubtask: (taskId, title) =>
        set((state) => {
          const task = state.tasks.find((t) => t.id === taskId)
          if (!task) return
          task.subtasks.push({ id: nanoid(), title, completed: false, createdAt: now() })
          task.updatedAt = now()
        }),

      toggleSubtask: (taskId, subtaskId) =>
        set((state) => {
          const task = state.tasks.find((t) => t.id === taskId)
          if (!task) return
          const sub = task.subtasks.find((s) => s.id === subtaskId)
          if (sub) { sub.completed = !sub.completed; task.updatedAt = now() }
        }),

      updateSubtask: (taskId, subtaskId, title) =>
        set((state) => {
          const task = state.tasks.find((t) => t.id === taskId)
          if (!task) return
          const sub = task.subtasks.find((s) => s.id === subtaskId)
          if (sub) { sub.title = title; task.updatedAt = now() }
        }),

      deleteSubtask: (taskId, subtaskId) =>
        set((state) => {
          const task = state.tasks.find((t) => t.id === taskId)
          if (!task) return
          task.subtasks = task.subtasks.filter((s) => s.id !== subtaskId)
          task.updatedAt = now()
        }),

      // ── Note CRUD ───────────────────────────────────────────────────────────
      addNote: (taskId, content) =>
        set((state) => {
          const task = state.tasks.find((t) => t.id === taskId)
          if (!task) return
          const ts = now()
          task.notes.unshift({ id: nanoid(), content, createdAt: ts, updatedAt: ts })
          task.updatedAt = ts
        }),

      updateNote: (taskId, noteId, content) =>
        set((state) => {
          const task = state.tasks.find((t) => t.id === taskId)
          if (!task) return
          const note = task.notes.find((n) => n.id === noteId)
          if (note) { note.content = content; note.updatedAt = now(); task.updatedAt = now() }
        }),

      deleteNote: (taskId, noteId) =>
        set((state) => {
          const task = state.tasks.find((t) => t.id === taskId)
          if (!task) return
          task.notes = task.notes.filter((n) => n.id !== noteId)
          task.updatedAt = now()
        }),

      getTaskById: (id) => get().tasks.find((t) => t.id === id),
    })),
    {
      name: 'taskflow-tasks',
      storage: createJSONStorage(() => localStorage),
      version: 3,
      migrate: (state, version) => {
        let s = state
        if (version < 2) {
          s = { ...s, tasks: (s.tasks ?? []).map((t) => ({ ...t, projectId: t.projectId ?? null })) }
        }
        if (version < 3) {
          s = { ...s, tasks: (s.tasks ?? []).map((t) => ({ ...t, dependsOn: t.dependsOn ?? [] })) }
        }
        return s
      },
    }
  )
)

export default useTaskStore
