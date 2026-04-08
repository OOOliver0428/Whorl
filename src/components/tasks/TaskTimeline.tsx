import { useMemo } from 'react'
import { useAppStore, type Task } from '../../store'
import { format, parseISO, differenceInDays, addDays, eachWeekOfInterval, isToday, isPast } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { motion } from 'framer-motion'
import { CalendarOff, CheckCircle2, Circle, AlertCircle } from 'lucide-react'

interface GroupedProject {
  name: string
  color: string
  icon: string
  tasks: Task[]
}

const PRIORITY_COLORS = ['#94a3b8', '#3b82f6', '#f59e0b', '#ef4444']

export default function TaskTimeline() {
  const { tasks, timelineShowNoDate, setTimelineShowNoDate, toggleTask } = useAppStore()

  // Filter: only tasks with due_date, unless toggle is on
  const timelineTasks = useMemo(() => {
    if (timelineShowNoDate) return tasks
    return tasks.filter((t) => t.due_date)
  }, [tasks, timelineShowNoDate])

  // Calculate date range for the axis
  const { axisStart, axisEnd, totalDays } = useMemo(() => {
    const today = new Date()
    const withDates = tasks.filter((t) => t.due_date)
    if (withDates.length === 0) {
      const start = addDays(today, -14)
      const end = addDays(today, 90)
      return { axisStart: start, axisEnd: end, totalDays: differenceInDays(end, start) }
    }

    let minDate = today
    let maxDate = addDays(today, 30)
    for (const t of withDates) {
      const created = parseISO(t.created_at)
      const due = parseISO(t.due_date!)
      if (created < minDate) minDate = created
      if (due > maxDate) maxDate = due
    }
    // Add padding
    minDate = addDays(minDate, -7)
    maxDate = addDays(maxDate, 14)
    return { axisStart: minDate, axisEnd: maxDate, totalDays: differenceInDays(maxDate, minDate) }
  }, [tasks])

  // Generate week markers
  const weeks = useMemo(() => {
    return eachWeekOfInterval({ start: axisStart, end: axisEnd }, { weekStartsOn: 1 })
  }, [axisStart, axisEnd])

  // Group tasks by project
  const groups = useMemo(() => {
    const map = new Map<string, GroupedProject>()
    for (const task of timelineTasks) {
      const key = task.project_id ? `p${task.project_id}` : 'none'
      if (!map.has(key)) {
        map.set(key, {
          name: task.project_name || '无项目',
          color: task.project_color || '#94a3b8',
          icon: task.project_icon || '📋',
          tasks: [],
        })
      }
      map.get(key)!.tasks.push(task)
    }
    return Array.from(map.values())
  }, [timelineTasks])

  const getBarStyle = (task: Task) => {
    const startDate = parseISO(task.created_at)
    const endDate = task.due_date ? parseISO(task.due_date) : axisStart
    const left = Math.max(0, (differenceInDays(startDate, axisStart) / totalDays) * 100)
    const width = Math.max(1.5, (differenceInDays(endDate, startDate) / totalDays) * 100)
    return { left: `${left}%`, width: `${Math.min(width, 100 - left)}%` }
  }

  const getNoDateStyle = () => {
    const today = new Date()
    const left = (differenceInDays(today, axisStart) / totalDays) * 100
    return { left: `${left}%`, width: '1.5%' }
  }

  const todayPosition = (differenceInDays(new Date(), axisStart) / totalDays) * 100

  if (timelineTasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-text-muted">
        <CalendarOff size={48} strokeWidth={1.5} className="mb-4" />
        <p className="font-display text-lg font-medium">暂无任务可显示</p>
        <p className="mt-1 text-sm">
          {timelineShowNoDate ? '当前视图没有任务' : '创建带有截止日期的任务以在时间线中显示'}
        </p>
        {!timelineShowNoDate && (
          <button
            onClick={() => setTimelineShowNoDate(true)}
            className="mt-3 rounded-lg border border-border px-4 py-2 text-sm transition-colors hover:bg-surface-hover"
          >
            显示所有任务
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Toggle */}
      <div className="flex items-center gap-2">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-text-secondary">
          <input
            type="checkbox"
            checked={timelineShowNoDate}
            onChange={(e) => setTimelineShowNoDate(e.target.checked)}
            className="checkbox-done !h-4 !w-4 !rounded-sm"
          />
          显示无截止日期的任务
        </label>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-[11px] text-text-muted">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-6 rounded-sm bg-primary" /> 已完成
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-6 rounded-sm bg-primary/40" /> 未完成
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2.5 w-6 rounded-sm bg-danger/50" /> 逾期
        </span>
      </div>

      {/* Timeline */}
      <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
        <div className="min-w-[800px]">
          {/* Time axis header */}
          <div className="flex border-b border-border">
            {/* Task name column header */}
            <div className="w-56 shrink-0 border-r border-border px-4 py-2">
              <span className="text-xs font-medium text-text-muted">任务</span>
            </div>
            {/* Time axis */}
            <div className="relative flex-1">
              <div className="flex">
                {weeks.map((weekStart, i) => (
                  <div
                    key={i}
                    className="flex-1 border-r border-border-subtle px-1 py-2 text-center text-[11px] text-text-muted"
                  >
                    {format(weekStart, 'M/d', { locale: zhCN })}
                  </div>
                ))}
              </div>
              {/* Today marker */}
              {todayPosition >= 0 && todayPosition <= 100 && (
                <div
                  className="absolute bottom-0 top-0 z-10 w-px bg-danger/60"
                  style={{ left: `${todayPosition}%` }}
                >
                  <div className="absolute -left-3 -top-0.5 text-[9px] font-medium text-danger">今</div>
                </div>
              )}
            </div>
          </div>

          {/* Task rows grouped by project */}
          {groups.map((group, gi) => (
            <motion.div
              key={group.name}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: gi * 0.05 }}
            >
              {/* Project group header */}
              <div className="flex border-b border-border-subtle bg-bg/50">
                <div className="flex w-56 shrink-0 items-center gap-2 border-r border-border px-4 py-2">
                  <span
                    className="flex h-5 w-5 items-center justify-center rounded text-xs"
                    style={{ backgroundColor: group.color + '20', color: group.color }}
                  >
                    {group.icon}
                  </span>
                  <span className="text-xs font-semibold text-text-secondary">{group.name}</span>
                  <span className="text-[10px] text-text-muted">({group.tasks.length})</span>
                </div>
                <div className="relative flex-1" />
              </div>

              {/* Task rows */}
              {group.tasks.map((task, ti) => {
                const isDone = task.status === 'done'
                const isOverdue = task.due_date && isPast(parseISO(task.due_date)) && !isDone && !isToday(parseISO(task.due_date))
                const hasDueDate = !!task.due_date

                return (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: gi * 0.05 + ti * 0.02 }}
                    className="group flex border-b border-border-subtle transition-colors hover:bg-surface-hover"
                  >
                    {/* Task name */}
                    <div className="flex w-56 shrink-0 items-center gap-2 border-r border-border px-4 py-2.5">
                      <button
                        onClick={() => toggleTask(task)}
                        className="shrink-0 text-text-muted transition-colors hover:text-primary"
                      >
                        {isDone ? <CheckCircle2 size={14} className="text-success" /> : <Circle size={14} />}
                      </button>
                      <span className={`truncate text-sm ${isDone ? 'text-text-muted line-through' : 'text-text'}`}>
                        {task.title}
                      </span>
                      {isOverdue && <AlertCircle size={12} className="shrink-0 text-danger" />}
                    </div>

                    {/* Bar area */}
                    <div className="relative flex-1 py-2.5">
                      {hasDueDate ? (
                        <div
                          className="absolute top-1/2 h-5 -translate-y-1/2 rounded-md transition-all"
                          style={{
                            ...getBarStyle(task),
                            backgroundColor: isDone ? 'var(--color-primary)' : isOverdue ? 'var(--color-danger)' : (group.color || PRIORITY_COLORS[task.priority]),
                            opacity: isDone ? 0.7 : 0.45,
                          }}
                        >
                          {/* Bar label on hover */}
                          <div className="pointer-events-none absolute inset-0 flex items-center overflow-hidden px-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                            <span className="truncate text-[10px] font-medium text-white drop-shadow">
                              {format(parseISO(task.created_at), 'M/d')} → {format(parseISO(task.due_date!), 'M/d')}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div
                          className="absolute top-1/2 h-4 w-3 -translate-y-1/2 rounded-sm bg-text-muted/30"
                          style={getNoDateStyle()}
                          title="无截止日期"
                        />
                      )}
                    </div>
                  </motion.div>
                )
              })}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
