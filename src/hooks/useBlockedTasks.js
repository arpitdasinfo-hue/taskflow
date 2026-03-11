import { useMemo } from 'react'
import useTaskStore from '../store/useTaskStore'

/**
 * Returns a Set of task IDs that are effectively blocked
 * because at least one of their dependencies is not 'done'.
 */
export function useBlockedByDependency() {
  const tasks = useTaskStore((s) => s.tasks)

  return useMemo(() => {
    const doneIds = new Set(tasks.filter((t) => t.status === 'done').map((t) => t.id))
    const blockedSet = new Set()

    for (const task of tasks) {
      const deps = task.dependsOn ?? []
      if (deps.length > 0 && deps.some((depId) => !doneIds.has(depId))) {
        blockedSet.add(task.id)
      }
    }
    return blockedSet
  }, [tasks])
}

/**
 * Returns whether a specific task is blocked by an incomplete dependency.
 */
export function useIsBlockedByDependency(taskId) {
  const blockedSet = useBlockedByDependency()
  return blockedSet.has(taskId)
}
