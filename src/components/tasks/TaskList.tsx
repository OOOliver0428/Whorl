import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence, Reorder } from 'framer-motion'
import { useAppStore, type Task } from '../../store'
import { api } from '../../api'
import TaskItem from './TaskItem'
import { Inbox, CheckCircle2, ListTodo, CornerDownRight } from 'lucide-react'

export default function TaskList() {
  const { tasks, currentView } = useAppStore()

  if (currentView === 'today') {
    return <TodayView tasks={tasks} />
  }

  return <DefaultView tasks={tasks} />
}

function TodayView({ tasks }: { tasks: Task[] }) {
  const [orphanSubtasks, setOrphanSubtasks] = useState<Task[]>([])
  const [parentMap, setParentMap] = useState<Map<number, Task>>(new Map())
  const [loading, setLoading] = useState(true)

  // Top-level tasks from the store (already filtered by due=today)
  const topTasks = tasks.filter((t) => !t.parent_id)

  // Orphaned subtasks: subtasks whose parent is NOT in today's list
  const storeOrphans = tasks.filter((t) => t.parent_id && !tasks.some((p) => p.id === t.parent_id))

  useEffect(() => {
    loadOrphanContext()
  }, [tasks])

  async function loadOrphanContext() {
    if (storeOrphans.length === 0) {
      setOrphanSubtasks([])
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      // Group orphans by parent_id and fetch parent info
      const parentIds = [...new Set(storeOrphans.map((t) => t.parent_id!))]
      const parentTasks: Task[] = []
      for (const pid of parentIds) {
        try {
          const p = await api.getTask(pid)
          parentTasks.push(p as Task)
        } catch { /* parent may be deleted */ }
      }

      const map = new Map<number, Task>()
      for (const p of parentTasks) {
        map.set(p.id, p)
      }

      setOrphanSubtasks(storeOrphans)
      setParentMap(map)
    } finally {
      setLoading(false)
    }
  }

  // Group orphans by parent
  const orphanGroups = useMemo(() => {
    const groups = new Map<number, Task[]>()
    for (const t of orphanSubtasks) {
      if (!t.parent_id) continue
      if (!groups.has(t.parent_id)) groups.set(t.parent_id, [])
      groups.get(t.parent_id)!.push(t)
    }
    return groups
  }, [orphanSubtasks])

  const todoTop = topTasks.filter((t) => t.status !== 'done')
  const doneTop = topTasks.filter((t) => t.status === 'done')

  if (tasks.length === 0 && !loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-20 text-text-muted"
      >
        <div className="mb-4 rounded-2xl bg-surface p-6 shadow-sm">
          <Inbox size={48} strokeWidth={1.5} />
        </div>
        <p className="font-display text-lg font-medium">今日无到期任务</p>
        <p className="mt-1 text-sm">享受轻松的一天吧</p>
      </motion.div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Top-level tasks due today */}
      {todoTop.length > 0 && (
        <div>
          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-text-secondary">
            <ListTodo size={16} />
            待办 · {todoTop.length}
          </div>
          <div className="space-y-1">
            <AnimatePresence mode="popLayout">
              {todoTop.map((task, i) => (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <TaskItem task={task} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Orphaned subtasks due today (parent not due today) */}
      {orphanGroups.size > 0 && (
        <div>
          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-text-secondary">
            <CornerDownRight size={16} />
            子任务到期 · {orphanSubtasks.length}
          </div>
          <div className="space-y-3">
            {Array.from(orphanGroups.entries()).map(([parentId, subs]) => {
              const parent = parentMap.get(parentId)
              return (
                <div key={parentId} className="rounded-xl border border-border bg-surface p-3">
                  {/* Parent context header */}
                  <div className="mb-2 flex items-center gap-2 text-xs text-text-muted">
                    <span
                      className="rounded px-1.5 py-0.5 font-medium"
                      style={{
                        backgroundColor: (parent?.project_color || '#94a3b8') + '15',
                        color: parent?.project_color || '#94a3b8',
                      }}
                    >
                      {parent?.project_icon || '📋'} {parent?.project_name || '无项目'}
                    </span>
                    <span>/</span>
                    <span className="font-medium text-text-secondary">
                      {parent?.title || '未知父任务'}
                    </span>
                  </div>
                  {/* Subtasks */}
                  <div className="space-y-0.5">
                    {subs.filter((t) => t.status !== 'done').map((task) => (
                      <TaskItem key={task.id} task={task} />
                    ))}
                    {subs.filter((t) => t.status === 'done').map((task) => (
                      <TaskItem key={task.id} task={task} />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Done top-level tasks */}
      {doneTop.length > 0 && (
        <div>
          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-text-muted">
            <CheckCircle2 size={16} />
            已完成 · {doneTop.length}
          </div>
          <div className="space-y-1">
            <AnimatePresence mode="popLayout">
              {doneTop.map((task, i) => (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: i * 0.03 }}
                >
                  <TaskItem task={task} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  )
}

function DefaultView({ tasks }: { tasks: Task[] }) {
  const { reorderTasks } = useAppStore()
  const [todoList, setTodoList] = useState<Task[]>([])
  const [doneList, setDoneList] = useState<Task[]>([])

  useEffect(() => {
    setTodoList(tasks.filter((t) => t.status !== 'done'))
    setDoneList(tasks.filter((t) => t.status === 'done'))
  }, [tasks])

  const handleTodoReorder = (newOrder: Task[]) => {
    setTodoList(newOrder)
    const orders = newOrder.map((t, i) => ({ id: t.id, sort_order: i }))
    reorderTasks(orders)
  }

  const handleDoneReorder = (newOrder: Task[]) => {
    setDoneList(newOrder)
    const orders = newOrder.map((t, i) => ({ id: t.id, sort_order: i }))
    reorderTasks(orders)
  }

  if (tasks.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-20 text-text-muted"
      >
        <div className="mb-4 rounded-2xl bg-surface p-6 shadow-sm">
          <Inbox size={48} strokeWidth={1.5} />
        </div>
        <p className="font-display text-lg font-medium">暂无任务</p>
        <p className="mt-1 text-sm">点击右上角「新建」添加你的第一个任务</p>
      </motion.div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Todo tasks */}
      {todoList.length > 0 && (
        <div>
          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-text-secondary">
            <ListTodo size={16} />
            待办 · {todoList.length}
          </div>
          <Reorder.Group
            axis="y"
            as="div"
            className="space-y-1"
            values={todoList.map((t) => t.id)}
            onReorder={(newIds) => {
              const map = new Map(todoList.map((t) => [t.id, t]))
              handleTodoReorder(newIds.map((id) => map.get(id as number)!))
            }}
          >
            {todoList.map((task, i) => (
              <Reorder.Item
                key={task.id}
                as="div"
                value={task.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <TaskItem task={task} />
              </Reorder.Item>
            ))}
          </Reorder.Group>
        </div>
      )}

      {/* Done tasks */}
      {doneList.length > 0 && (
        <div>
          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-text-muted">
            <CheckCircle2 size={16} />
            已完成 · {doneList.length}
          </div>
          <Reorder.Group
            axis="y"
            as="div"
            className="space-y-1"
            values={doneList.map((t) => t.id)}
            onReorder={(newIds) => {
              const map = new Map(doneList.map((t) => [t.id, t]))
              handleDoneReorder(newIds.map((id) => map.get(id as number)!))
            }}
          >
            {doneList.map((task, i) => (
              <Reorder.Item
                key={task.id}
                as="div"
                value={task.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <TaskItem task={task} />
              </Reorder.Item>
            ))}
          </Reorder.Group>
        </div>
      )}
    </div>
  )
}
