import {
  Activity,
  CalendarClock,
  FolderKanban,
  GanttChart,
  LayoutDashboard,
  ListTodo,
  Settings2,
  Trash2,
} from 'lucide-react'

export const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', pageTitle: 'Dashboard', icon: LayoutDashboard },
  { id: 'tasks', label: 'Tasks', pageTitle: 'Tasks', icon: ListTodo },
  { id: 'today', label: 'Planner', pageTitle: 'Planner', icon: CalendarClock },
  { id: 'projects', label: 'Programs', pageTitle: 'Programs', icon: FolderKanban },
  { id: 'timeline', label: 'Timeline', pageTitle: 'Timeline', icon: GanttChart },
  { id: 'activity', label: 'Activity', pageTitle: 'Activity', icon: Activity },
  { id: 'trash', label: 'Trash', pageTitle: 'Trash', icon: Trash2 },
  { id: 'settings', label: 'Settings', pageTitle: 'Settings', icon: Settings2 },
]

export const MOBILE_PRIMARY_NAV_IDS = ['dashboard', 'tasks', 'today', 'projects', 'timeline']

export const MOBILE_OVERFLOW_NAV_IDS = ['activity', 'trash', 'settings']

export const NAV_ITEMS_BY_ID = Object.fromEntries(NAV_ITEMS.map((item) => [item.id, item]))

export const PAGE_TITLES = {
  ...Object.fromEntries(NAV_ITEMS.map(({ id, pageTitle }) => [id, pageTitle])),
  'program-dashboard': 'Dashboard',
}

export const getNavItem = (id) => NAV_ITEMS_BY_ID[id] ?? null
