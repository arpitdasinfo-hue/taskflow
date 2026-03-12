import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, Clock, ExternalLink, Link2, Lock } from 'lucide-react'
import { supabase } from '../lib/supabase'

const STATUS_LABEL = {
  todo: 'To Do',
  'in-progress': 'In Progress',
  review: 'In Review',
  blocked: 'Blocked',
  done: 'Done',
}

export default function ShareView({ token }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [resourceType, setResourceType] = useState('')
  const [resourceName, setResourceName] = useState('')
  const [resourceDescription, setResourceDescription] = useState('')
  const [programName, setProgramName] = useState('')
  const [tasks, setTasks] = useState([])

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoading(true)
      setError('')

      const { data: link, error: linkError } = await supabase
        .from('share_links')
        .select('*')
        .eq('token', token)
        .maybeSingle()

      if (linkError || !link) {
        if (!cancelled) {
          setError(linkError?.message || 'Invalid or expired link.')
          setLoading(false)
        }
        return
      }

      if (link.expires_at && new Date(link.expires_at).getTime() < Date.now()) {
        if (!cancelled) {
          setError('This share link has expired.')
          setLoading(false)
        }
        return
      }

      setResourceType(link.resource_type)

      if (link.resource_type === 'program') {
        const { data: program, error: programError } = await supabase
          .from('programs')
          .select('*')
          .eq('id', link.resource_id)
          .maybeSingle()

        if (programError || !program) {
          if (!cancelled) {
            setError(programError?.message || 'Program not found or not accessible.')
            setLoading(false)
          }
          return
        }

        const { data: projects, error: projectsError } = await supabase
          .from('projects')
          .select('id')
          .eq('program_id', program.id)

        if (projectsError) {
          if (!cancelled) {
            setError(projectsError.message)
            setLoading(false)
          }
          return
        }

        const projectIds = (projects ?? []).map((p) => p.id)
        let taskRows = []
        if (projectIds.length > 0) {
          const { data, error: tasksError } = await supabase
            .from('tasks')
            .select('*')
            .in('project_id', projectIds)
            .order('created_at', { ascending: false })
          if (tasksError) {
            if (!cancelled) {
              setError(tasksError.message)
              setLoading(false)
            }
            return
          }
          taskRows = data ?? []
        }

        if (!cancelled) {
          setResourceName(program.name)
          setResourceDescription(program.description || '')
          setTasks(taskRows)
          setLoading(false)
        }
        return
      }

      if (link.resource_type === 'project') {
        const { data: project, error: projectError } = await supabase
          .from('projects')
          .select('*')
          .eq('id', link.resource_id)
          .maybeSingle()

        if (projectError || !project) {
          if (!cancelled) {
            setError(projectError?.message || 'Project not found or not accessible.')
            setLoading(false)
          }
          return
        }

        let program = null
        if (project.program_id) {
          const { data } = await supabase
            .from('programs')
            .select('name')
            .eq('id', project.program_id)
            .maybeSingle()
          program = data
        }

        const { data: taskRows, error: tasksError } = await supabase
          .from('tasks')
          .select('*')
          .eq('project_id', project.id)
          .order('created_at', { ascending: false })

        if (tasksError) {
          if (!cancelled) {
            setError(tasksError.message)
            setLoading(false)
          }
          return
        }

        if (!cancelled) {
          setResourceName(project.name)
          setResourceDescription(project.description || '')
          setProgramName(program?.name || '')
          setTasks(taskRows ?? [])
          setLoading(false)
        }
        return
      }

      if (!cancelled) {
        setError('Unsupported share link type.')
        setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [token])

  const stats = useMemo(() => {
    const total = tasks.length
    const done = tasks.filter((t) => t.status === 'done').length
    const inProgress = tasks.filter((t) => t.status === 'in-progress').length
    const blocked = tasks.filter((t) => t.status === 'blocked').length
    return { total, done, inProgress, blocked }
  }, [tasks])

  return (
    <div className="min-h-dvh px-4 py-6 md:py-10" style={{ background: 'var(--bg-gradient)' }}>
      <div className="max-w-4xl mx-auto">
        <div
          className="rounded-2xl p-5 mb-4"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(var(--accent-rgb),0.18)' }}
        >
          <div className="flex items-center gap-2 mb-2" style={{ color: 'var(--accent)' }}>
            <Link2 size={15} />
            <span className="text-xs font-semibold uppercase tracking-wide">Shared TaskFlow View</span>
          </div>

          {loading ? (
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Loading shared content…
            </p>
          ) : error ? (
            <div className="flex items-start gap-2">
              <AlertTriangle size={14} style={{ color: '#ef4444', marginTop: 2 }} />
              <p className="text-sm" style={{ color: '#ef4444' }}>
                {error}
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                  {resourceName}
                </h1>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(var(--accent-rgb),0.15)', color: 'var(--accent)' }}>
                  {resourceType}
                </span>
              </div>
              {programName && (
                <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>
                  Program: {programName}
                </p>
              )}
              {resourceDescription && (
                <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
                  {resourceDescription}
                </p>
              )}

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <div className="rounded-xl px-3 py-2" style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <p className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>Total</p>
                  <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{stats.total}</p>
                </div>
                <div className="rounded-xl px-3 py-2" style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <p className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>In Progress</p>
                  <p className="text-sm font-bold" style={{ color: '#22d3ee' }}>{stats.inProgress}</p>
                </div>
                <div className="rounded-xl px-3 py-2" style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <p className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>Blocked</p>
                  <p className="text-sm font-bold" style={{ color: '#ef4444' }}>{stats.blocked}</p>
                </div>
                <div className="rounded-xl px-3 py-2" style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <p className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>Done</p>
                  <p className="text-sm font-bold" style={{ color: '#10b981' }}>{stats.done}</p>
                </div>
              </div>
            </>
          )}
        </div>

        {!loading && !error && (
          <div
            className="rounded-2xl overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <div className="px-4 py-2 text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              Tasks
            </div>
            {tasks.length === 0 ? (
              <p className="px-4 py-6 text-sm" style={{ color: 'var(--text-secondary)' }}>
                No tasks available.
              </p>
            ) : (
              <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                {tasks.map((task) => (
                  <div key={task.id} className="px-4 py-3 flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: task.priority === 'critical' ? '#ef4444' : task.priority === 'high' ? '#f97316' : task.priority === 'medium' ? '#f59e0b' : '#94a3b8' }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                        {task.title}
                      </p>
                      {task.description && (
                        <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                          {task.description}
                        </p>
                      )}
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0"
                      style={{ background: task.status === 'done' ? 'rgba(16,185,129,0.15)' : 'rgba(148,163,184,0.15)', color: task.status === 'done' ? '#10b981' : 'var(--text-secondary)' }}>
                      {STATUS_LABEL[task.status] || task.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="mt-4 flex items-center justify-center gap-2 text-[11px]" style={{ color: 'var(--text-secondary)' }}>
          <Lock size={12} />
          Read-only view
          <span>•</span>
          <a href={window.location.origin} className="inline-flex items-center gap-1 hover:opacity-80" style={{ color: 'var(--accent)' }}>
            Powered by TaskFlow <ExternalLink size={11} />
          </a>
        </div>
      </div>
    </div>
  )
}
