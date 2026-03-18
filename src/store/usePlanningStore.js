import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { nanoid } from 'nanoid'
import { supabase } from '../lib/supabase'
import useWorkspaceStore from './useWorkspaceStore'
import useAuthStore from './useAuthStore'
import useTaskStore from './useTaskStore'
import {
  PLANNING_BUCKETS,
  getPeriodBounds,
  resolveAutoPlanningBucket,
  taskQualifiesForPlanningPeriod,
} from '../lib/planning'

const now = () => new Date().toISOString()
const VALID_PERIODS = ['day', 'week', 'month']
const PERIOD_ORDER = { day: 0, week: 1, month: 2 }

const getSyncContext = () => {
  const workspaceId = useWorkspaceStore.getState().workspaceId
  const userId = useAuthStore.getState().user?.id ?? null
  return { workspaceId, userId }
}

const normalizePeriodType = (value) => (VALID_PERIODS.includes(value) ? value : 'week')

const normalizeBucket = (periodType, value) => {
  const options = PLANNING_BUCKETS[periodType] ?? PLANNING_BUCKETS.week
  return options.includes(value) ? value : options[0]
}

const buildPeriodBounds = (periodType, periodStart = null, periodEnd = null) => {
  if (periodStart) {
    const resolved = getPeriodBounds(periodType, periodStart)
    return {
      startKey: periodStart,
      endKey: periodEnd ?? resolved.endKey,
    }
  }

  const resolved = getPeriodBounds(periodType)
  return {
    startKey: resolved.startKey,
    endKey: resolved.endKey,
  }
}

const normalizeCommitment = (raw = {}) => {
  const periodType = normalizePeriodType(raw.periodType)
  const bounds = buildPeriodBounds(periodType, raw.periodStart ?? null, raw.periodEnd ?? null)

  return {
    id: raw.id ?? nanoid(),
    taskId: raw.taskId ?? null,
    periodType,
    periodStart: bounds.startKey,
    periodEnd: bounds.endKey,
    bucket: normalizeBucket(periodType, raw.bucket),
    sortOrder: Number.isFinite(raw.sortOrder) ? raw.sortOrder : 0,
    createdAt: raw.createdAt ?? now(),
    updatedAt: raw.updatedAt ?? now(),
  }
}

const sortCommitments = (commitments = []) =>
  [...commitments].sort((left, right) => {
    if (left.periodStart !== right.periodStart) return left.periodStart > right.periodStart ? -1 : 1

    const leftPeriodOrder = PERIOD_ORDER[left.periodType] ?? 9
    const rightPeriodOrder = PERIOD_ORDER[right.periodType] ?? 9
    if (leftPeriodOrder !== rightPeriodOrder) return leftPeriodOrder - rightPeriodOrder

    const leftBucketOrder = (PLANNING_BUCKETS[left.periodType] ?? []).indexOf(left.bucket)
    const rightBucketOrder = (PLANNING_BUCKETS[right.periodType] ?? []).indexOf(right.bucket)
    if (leftBucketOrder !== rightBucketOrder) return leftBucketOrder - rightBucketOrder

    const leftSort = Number.isFinite(left.sortOrder) ? left.sortOrder : 0
    const rightSort = Number.isFinite(right.sortOrder) ? right.sortOrder : 0
    if (leftSort !== rightSort) return leftSort - rightSort

    return new Date(right.updatedAt ?? 0) - new Date(left.updatedAt ?? 0)
  })

const sanitizeCommitments = (commitments = []) => {
  const deduped = new Map()

  commitments.forEach((commitment) => {
    const normalized = normalizeCommitment(commitment)
    if (!normalized.taskId) return
    const key = `${normalized.taskId}:${normalized.periodType}:${normalized.periodStart}`
    const existing = deduped.get(key)
    if (!existing || new Date(normalized.updatedAt) > new Date(existing.updatedAt)) {
      deduped.set(key, normalized)
    }
  })

  return sortCommitments(Array.from(deduped.values()))
}

const getNextSortOrder = (commitments = [], periodType, periodStart, bucket) => {
  const peers = commitments.filter(
    (commitment) =>
      commitment.periodType === periodType &&
      commitment.periodStart === periodStart &&
      commitment.bucket === bucket
  )

  const maxSort = peers.reduce(
    (highest, commitment) => Math.max(highest, Number.isFinite(commitment.sortOrder) ? commitment.sortOrder : 0),
    -1
  )

  return maxSort + 1
}

const toCommitmentRow = (commitment, workspaceId, userId) => ({
  id: commitment.id,
  workspace_id: workspaceId,
  task_id: commitment.taskId,
  period_type: commitment.periodType,
  period_start: commitment.periodStart,
  period_end: commitment.periodEnd ?? commitment.periodStart,
  bucket: commitment.bucket,
  sort_order: Number.isFinite(commitment.sortOrder) ? commitment.sortOrder : 0,
  created_by: userId,
  created_at: commitment.createdAt ?? now(),
  updated_at: commitment.updatedAt ?? now(),
})

const fromCommitmentRow = (row) =>
  normalizeCommitment({
    id: row.id,
    taskId: row.task_id ?? null,
    periodType: row.period_type,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    bucket: row.bucket,
    sortOrder: row.sort_order ?? 0,
    createdAt: row.created_at ?? now(),
    updatedAt: row.updated_at ?? row.created_at ?? now(),
  })

const cloneCommitments = (commitments = []) => commitments.map((commitment) => ({ ...commitment }))

const getPlanningSyncErrorMessage = (error) => {
  const rawMessage = error?.message || 'Unable to sync planner changes to Supabase.'
  const normalized = rawMessage.toLowerCase()

  if (normalized.includes('task_commitments')) {
    return 'Planner sync is blocked. Please confirm the task_commitments table and policies are updated in Supabase.'
  }

  if (normalized.includes('row-level security')) {
    return 'Planner sync is blocked by Supabase RLS. Please run the latest scripts/supabase_policies.sql in Supabase SQL Editor.'
  }

  return rawMessage
}

const reportPlanningSyncError = (set, error, action) => {
  const message = getPlanningSyncErrorMessage(error)
  console.error(`[sync] Failed to ${action}:`, error)
  set((state) => {
    state.syncError = message
  })
}

const clearPlanningSyncError = (set) => {
  set((state) => {
    state.syncError = ''
  })
}

const markPlanningSyncSuccess = (set) => {
  set((state) => {
    state.syncError = ''
    state.lastSyncedAt = now()
  })
}

async function persistCommitmentRows(commitments, workspaceId, userId) {
  if (!workspaceId || !commitments.length) return
  const { error } = await supabase.from('task_commitments').upsert(
    commitments.map((commitment) => toCommitmentRow(commitment, workspaceId, userId))
  )
  if (error) throw error
}

async function deleteCommitmentRow(id) {
  const { error } = await supabase.from('task_commitments').delete().eq('id', id)
  if (error) throw error
}

async function fetchWorkspaceCommitments(workspaceId) {
  const { data, error } = await supabase
    .from('task_commitments')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('period_start', { ascending: false })
    .order('sort_order', { ascending: true })

  if (error) throw error
  return data ?? []
}

const usePlanningStore = create(
  persist(
    immer((set, get) => ({
      commitments: [],
      syncing: false,
      syncError: '',
      lastSyncedAt: null,

      clearSyncError: () => clearPlanningSyncError(set),

      reset: () =>
        set((state) => {
          state.commitments = []
          state.syncing = false
          state.syncError = ''
          state.lastSyncedAt = null
        }),

      commitTask: ({ taskId, periodType = 'week', bucket = null, periodStart = null, periodEnd = null }) => {
        const task = useTaskStore.getState().getTaskById(taskId)
        if (!task || task.deletedAt) return null

        const normalizedPeriodType = normalizePeriodType(periodType)
        const bounds = buildPeriodBounds(normalizedPeriodType, periodStart, periodEnd)
        const nextBucket = normalizeBucket(normalizedPeriodType, bucket)
        const previousCommitments = cloneCommitments(get().commitments)
        let savedCommitment = null

        set((state) => {
          const existing = state.commitments.find(
            (commitment) =>
              commitment.taskId === taskId &&
              commitment.periodType === normalizedPeriodType &&
              commitment.periodStart === bounds.startKey
          )

          if (existing) {
            const previousBucket = existing.bucket
            existing.bucket = nextBucket
            existing.periodEnd = bounds.endKey
            if (previousBucket !== nextBucket) {
              existing.sortOrder = getNextSortOrder(state.commitments, normalizedPeriodType, bounds.startKey, nextBucket)
            }
            existing.updatedAt = now()
            savedCommitment = { ...existing }
          } else {
            const created = normalizeCommitment({
              taskId,
              periodType: normalizedPeriodType,
              periodStart: bounds.startKey,
              periodEnd: bounds.endKey,
              bucket: nextBucket,
              sortOrder: getNextSortOrder(state.commitments, normalizedPeriodType, bounds.startKey, nextBucket),
            })
            state.commitments.push(created)
            savedCommitment = { ...created }
          }

          state.commitments = sanitizeCommitments(state.commitments)
        })

        const { workspaceId, userId } = getSyncContext()
        if (workspaceId && savedCommitment) {
          void persistCommitmentRows([savedCommitment], workspaceId, userId)
            .then(() => markPlanningSyncSuccess(set))
            .catch((error) => {
              set((state) => {
                state.commitments = sanitizeCommitments(previousCommitments)
              })
              reportPlanningSyncError(set, error, 'commit task into planner')
            })
        }

        return savedCommitment
      },

      updateCommitment: (id, updates) => {
        const previousCommitments = cloneCommitments(get().commitments)
        let updatedCommitment = null

        set((state) => {
          const commitment = state.commitments.find((entry) => entry.id === id)
          if (!commitment) return

          const nextPeriodType = normalizePeriodType(updates.periodType ?? commitment.periodType)
          const bounds = buildPeriodBounds(
            nextPeriodType,
            updates.periodStart ?? commitment.periodStart,
            updates.periodEnd ?? commitment.periodEnd
          )
          const nextBucket = normalizeBucket(nextPeriodType, updates.bucket ?? commitment.bucket)

          Object.assign(commitment, {
            ...updates,
            periodType: nextPeriodType,
            periodStart: bounds.startKey,
            periodEnd: bounds.endKey,
            bucket: nextBucket,
            updatedAt: now(),
          })

          updatedCommitment = normalizeCommitment(commitment)
          state.commitments = sanitizeCommitments(state.commitments)
        })

        const { workspaceId, userId } = getSyncContext()
        if (workspaceId && updatedCommitment) {
          void persistCommitmentRows([updatedCommitment], workspaceId, userId)
            .then(() => markPlanningSyncSuccess(set))
            .catch((error) => {
              set((state) => {
                state.commitments = sanitizeCommitments(previousCommitments)
              })
              reportPlanningSyncError(set, error, 'update planner commitment')
            })
        }
      },

      setCommitmentLayout: (entries = []) => {
        if (!entries.length) return
        const previousCommitments = cloneCommitments(get().commitments)
        const changedCommitments = []

        set((state) => {
          entries.forEach((entry) => {
            const commitment = state.commitments.find((item) => item.id === entry.id)
            if (!commitment) return

            const nextPeriodType = normalizePeriodType(entry.periodType ?? commitment.periodType)
            const bounds = buildPeriodBounds(
              nextPeriodType,
              entry.periodStart ?? commitment.periodStart,
              entry.periodEnd ?? commitment.periodEnd
            )
            const nextBucket = normalizeBucket(nextPeriodType, entry.bucket ?? commitment.bucket)

            Object.assign(commitment, {
              ...entry,
              periodType: nextPeriodType,
              periodStart: bounds.startKey,
              periodEnd: bounds.endKey,
              bucket: nextBucket,
              updatedAt: now(),
            })

            changedCommitments.push(normalizeCommitment(commitment))
          })

          state.commitments = sanitizeCommitments(state.commitments)
        })

        const { workspaceId, userId } = getSyncContext()
        if (workspaceId && changedCommitments.length > 0) {
          void persistCommitmentRows(changedCommitments, workspaceId, userId)
            .then(() => markPlanningSyncSuccess(set))
            .catch((error) => {
              set((state) => {
                state.commitments = sanitizeCommitments(previousCommitments)
              })
              reportPlanningSyncError(set, error, 'reorder planner commitments')
            })
        }
      },

      removeCommitment: (id) => {
        const previousCommitments = cloneCommitments(get().commitments)
        set((state) => {
          state.commitments = state.commitments.filter((commitment) => commitment.id !== id)
        })

        const { workspaceId } = getSyncContext()
        if (workspaceId) {
          void deleteCommitmentRow(id)
            .then(() => markPlanningSyncSuccess(set))
            .catch((error) => {
              set((state) => {
                state.commitments = sanitizeCommitments(previousCommitments)
              })
              reportPlanningSyncError(set, error, 'remove planner commitment')
            })
        }
      },

      carryForwardPeriod: ({ periodType = 'week', fromPeriodStart, toPeriodStart = null }) => {
        const normalizedPeriodType = normalizePeriodType(periodType)
        const sourceStart = fromPeriodStart ?? buildPeriodBounds(normalizedPeriodType).startKey
        const targetBounds = buildPeriodBounds(normalizedPeriodType, toPeriodStart, null)
        const taskMap = new Map(useTaskStore.getState().tasks.map((task) => [task.id, task]))
        const state = get()
        const previousCommitments = cloneCommitments(state.commitments)

        const existingKeys = new Set(
          state.commitments
            .filter(
              (commitment) =>
                commitment.periodType === normalizedPeriodType &&
                commitment.periodStart === targetBounds.startKey
            )
            .map((commitment) => commitment.taskId)
        )

        const sourceCommitments = state.commitments.filter(
          (commitment) =>
            commitment.periodType === normalizedPeriodType &&
            commitment.periodStart === sourceStart
        )

        const created = []

        set((draft) => {
          sourceCommitments.forEach((commitment) => {
            const task = taskMap.get(commitment.taskId)
            if (!task || task.status === 'done' || task.deletedAt || existingKeys.has(commitment.taskId)) return

            const nextCommitment = normalizeCommitment({
              taskId: commitment.taskId,
              periodType: normalizedPeriodType,
              periodStart: targetBounds.startKey,
              periodEnd: targetBounds.endKey,
              bucket: commitment.bucket,
              sortOrder: getNextSortOrder(
                draft.commitments,
                normalizedPeriodType,
                targetBounds.startKey,
                normalizeBucket(normalizedPeriodType, commitment.bucket)
              ),
            })

            draft.commitments.push(nextCommitment)
            created.push(nextCommitment)
            existingKeys.add(commitment.taskId)
          })

          draft.commitments = sanitizeCommitments(draft.commitments)
        })

        const { workspaceId, userId } = getSyncContext()
        if (workspaceId && created.length > 0) {
          void persistCommitmentRows(created, workspaceId, userId)
            .then(() => markPlanningSyncSuccess(set))
            .catch((error) => {
              set((draft) => {
                draft.commitments = sanitizeCommitments(previousCommitments)
              })
              reportPlanningSyncError(set, error, 'carry forward planner commitments')
            })
        }

        return created.length
      },

      syncScheduledCommitments: (referenceDate = new Date()) => {
        const taskMap = useTaskStore.getState().tasks ?? []
        const previousCommitments = cloneCommitments(get().commitments)
        const currentPeriods = {
          week: getPeriodBounds('week', referenceDate),
          month: getPeriodBounds('month', referenceDate),
        }
        const created = []

        set((state) => {
          const existingKeys = new Set(
            state.commitments.map((commitment) => `${commitment.taskId}:${commitment.periodType}:${commitment.periodStart}`)
          )

          ;(['week', 'month']).forEach((periodType) => {
            const bounds = currentPeriods[periodType]

            taskMap.forEach((task) => {
              if (!taskQualifiesForPlanningPeriod(task, periodType, bounds)) return

              const key = `${task.id}:${periodType}:${bounds.startKey}`
              if (existingKeys.has(key)) return

              const createdCommitment = normalizeCommitment({
                taskId: task.id,
                periodType,
                periodStart: bounds.startKey,
                periodEnd: bounds.endKey,
                bucket: resolveAutoPlanningBucket(task, periodType),
                sortOrder: getNextSortOrder(
                  state.commitments,
                  periodType,
                  bounds.startKey,
                  resolveAutoPlanningBucket(task, periodType)
                ),
              })

              state.commitments.push(createdCommitment)
              created.push(createdCommitment)
              existingKeys.add(key)
            })
          })

          if (created.length > 0) {
            state.commitments = sanitizeCommitments(state.commitments)
          }
        })

        const { workspaceId, userId } = getSyncContext()
        if (workspaceId && created.length > 0) {
          void persistCommitmentRows(created, workspaceId, userId)
            .then(() => markPlanningSyncSuccess(set))
            .catch((error) => {
              set((state) => {
                state.commitments = sanitizeCommitments(previousCommitments)
              })
              reportPlanningSyncError(set, error, 'auto-commit scheduled tasks')
            })
        }

        return created.length
      },

      migrateLocalToSupabase: async (workspaceId) => {
        if (!workspaceId) return
        const { userId } = getSyncContext()
        const rows = sanitizeCommitments(get().commitments).map((commitment) =>
          toCommitmentRow(commitment, workspaceId, userId)
        )

        if (rows.length > 0) {
          await supabase.from('task_commitments').upsert(rows)
        }
      },

      loadFromSupabase: async (workspaceId) => {
        if (!workspaceId) return
        set((state) => {
          state.syncing = true
        })

        try {
          let rows = await fetchWorkspaceCommitments(workspaceId)
          const hasRemoteData = rows.length > 0

          if (!hasRemoteData) {
            const localCommitments = sanitizeCommitments(get().commitments)
            if (localCommitments.length > 0) {
              await get().migrateLocalToSupabase(workspaceId)
              rows = await fetchWorkspaceCommitments(workspaceId)
            }
          }

          set((state) => {
            state.commitments = sanitizeCommitments(rows.map(fromCommitmentRow))
          })
          markPlanningSyncSuccess(set)
        } catch (error) {
          reportPlanningSyncError(set, error, 'load planner from Supabase')
        } finally {
          set((state) => {
            state.syncing = false
          })
        }
      },

      upsertCommitmentFromRealtime: (row) =>
        set((state) => {
          const commitment = fromCommitmentRow(row)
          const index = state.commitments.findIndex((entry) => entry.id === commitment.id)
          if (index === -1) state.commitments.push(commitment)
          else state.commitments[index] = { ...state.commitments[index], ...commitment }
          state.commitments = sanitizeCommitments(state.commitments)
        }),

      removeCommitmentFromRealtime: (id) =>
        set((state) => {
          state.commitments = state.commitments.filter((commitment) => commitment.id !== id)
        }),
    })),
    {
      name: 'taskflow-planning',
      storage: createJSONStorage(() => localStorage),
      version: 2,
      migrate: (state) => ({
        commitments: sanitizeCommitments(state?.commitments ?? []),
        syncing: false,
        syncError: '',
        lastSyncedAt: state?.lastSyncedAt ?? null,
      }),
    }
  )
)

export default usePlanningStore
