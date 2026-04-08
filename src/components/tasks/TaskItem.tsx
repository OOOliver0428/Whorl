import { useAppStore } from '../../store'
import { api } from '../../api'
import { Calendar, Clock, ChevronRight, ChevronDown, Trash2, AlertCircle, Repeat, ListTree } from 'lucide-react'
import { format, isToday, isPast, parseISO } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import TaskForm from './TaskForm'
import type { Task } from '../../store'

const priorityColors = ['text-priority-0', 'text-priority-1', 'text-priority-2', 'text-priority-3']
const priorityBg = ['bg-priority-0/10', 'bg-priority-1/10', 'bg-priority-2/10', 'bg-priority-3/10']
const priorityLabels = ['低', '中', '高', '紧急']

interface Props {
  task: Task
  depth?: number
}

const recurrenceLabels: Record<string, string> = { daily: '每天', weekly: '每周', monthly: '每月' }

export default function TaskItem({ task, depth = 0 }: Props) {
  const { toggleTask, deleteTask } = useAppStore()
  const [expanded, setExpanded] = useState(false)
  const [subtasks, setSubtasks] = useState<Task[]>([])
  const [loadingSub, setLoadingSub] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const prevCountRef = useRef(task.subtask_count)

  const subtaskCount = task.subtask_count || 0

  // Auto-refresh subtasks when count changes while expanded
  useEffect(() => {
    if (expanded && task.subtask_count !== prevCountRef.current) {
      prevCountRef.current = task.subtask_count
      loadSubtasks(true)
    }
  }, [task.subtask_count])

  const isDone = task.status === 'done'
  const isOverdue = task.due_date && isPast(parseISO(task.due_date)) && !isDone && !isToday(parseISO(task.due_date))
  const isDueToday = task.due_date && isToday(parseISO(task.due_date))

  const loadSubtasks = async (silent = false) => {
    if (!silent) {
      if (expanded) { setExpanded(false); return }
      setLoadingSub(true)
    }
    setError(null)
    try {
      const data = await api.getTasks({ parent_id: String(task.id) })
      setSubtasks(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载子任务失败')
    } finally {
      setLoadingSub(false)
      setExpanded(true)
    }
  }

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm('确定删除此任务？')) {
      await deleteTask(task.id)
    }
  }

  const hasSubtasks = subtaskCount > 0

  return (
    <>
      <div
        className={`group relative rounded-xl border transition-all duration-200 ${
          isDone
            ? 'border-transparent bg-transparent opacity-60'
            : 'border-transparent bg-surface hover:border-border hover:shadow-sm'
        }`}
        style={{ marginLeft: depth * 24 }}
      >
        <div className="flex items-start gap-3 px-4 py-3">
          {/* Checkbox */}
          <input
            type="checkbox"
            checked={isDone}
            onChange={() => toggleTask(task)}
            className="checkbox-done mt-0.5"
          />

          {/* Content */}
          <div className="min-w-0 flex-1 cursor-pointer" onClick={() => setEditing(true)}>
            <div className="flex items-center gap-2">
              <h3
                className={`text-sm font-medium transition-all ${
                  isDone ? 'text-text-muted line-through' : 'text-text'
                }`}
              >
                {task.title}
              </h3>
              {isOverdue && (
                <span className="flex items-center gap-0.5 rounded-full bg-danger/10 px-1.5 py-0.5 text-[10px] font-medium text-danger">
                  <AlertCircle size={10} /> 逾期
                </span>
              )}
              {hasSubtasks && (
                <span
                  onClick={(e) => { e.stopPropagation(); loadSubtasks() }}
                  className="flex cursor-pointer items-center gap-0.5 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary hover:bg-primary/20"
                >
                  <ListTree size={10} /> {subtaskCount}
                </span>
              )}
            </div>

            {task.description && (
              <p className="mt-0.5 line-clamp-1 text-xs text-text-muted">{task.description}</p>
            )}

            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              {/* Priority */}
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${priorityBg[task.priority]} ${priorityColors[task.priority]}`}>
                {priorityLabels[task.priority]}
              </span>

              {/* Due date */}
              {task.due_date && (
                <span className={`flex items-center gap-1 text-[11px] ${
                  isOverdue ? 'text-danger font-medium' : isDueToday ? 'text-warning font-medium' : 'text-text-muted'
                }`}>
                  <Calendar size={11} />
                  {isDueToday ? '今天' : format(parseISO(task.due_date), 'M月d日', { locale: zhCN })}
                </span>
              )}

              {/* Project */}
              {task.project_name && (
                <span
                  className="rounded-full px-1.5 py-0.5 text-[10px] font-medium"
                  style={{
                    backgroundColor: (task.project_color || '#6366f1') + '15',
                    color: task.project_color || '#6366f1',
                  }}
                >
                  {task.project_icon} {task.project_name}
                </span>
              )}

              {/* Tags */}
              {task.tags?.map((tag) => (
                <span
                  key={tag.id}
                  className="rounded-full px-1.5 py-0.5 text-[10px]"
                  style={{ backgroundColor: tag.color + '20', color: tag.color }}
                >
                  #{tag.name}
                </span>
              ))}

              {/* Estimated time */}
              {task.estimated_minutes > 0 && (
                <span className="flex items-center gap-0.5 text-[11px] text-text-muted">
                  <Clock size={11} />
                  {task.estimated_minutes}min
                </span>
              )}

              {/* Recurrence */}
              {task.recurrence_rule && (
                <span className="flex items-center gap-0.5 text-[11px] text-primary">
                  <Repeat size={11} />
                  {recurrenceLabels[task.recurrence_rule] || task.recurrence_rule}
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => loadSubtasks()}
              className={`rounded-md p-1.5 text-text-muted transition-colors hover:bg-surface-hover hover:text-text ${
                hasSubtasks ? '' : 'opacity-0 group-hover:opacity-100'
              }`}
            >
              {loadingSub ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-text-muted border-t-transparent" />
              ) : expanded ? (
                <ChevronDown size={16} />
              ) : (
                <ChevronRight size={16} />
              )}
            </button>
            <button
              onClick={handleDelete}
              className="rounded-md p-1.5 text-text-muted opacity-0 transition-colors hover:bg-danger/10 hover:text-danger group-hover:opacity-100"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {/* Subtasks */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-t border-border-subtle"
            >
              {error ? (
                <div className="px-4 py-2 text-xs text-danger">{error}</div>
              ) : subtasks.length > 0 ? (
                <div className="space-y-0.5 py-1">
                  {subtasks.map((sub) => (
                    <TaskItem key={sub.id} task={sub} depth={depth + 1} />
                  ))}
                </div>
              ) : (
                <div className="px-4 py-2 text-xs text-text-muted">暂无子任务</div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {editing && <TaskForm task={task} onClose={() => setEditing(false)} />}
    </>
  )
}
