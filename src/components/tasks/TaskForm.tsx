import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '../../store'
import { X, Calendar, ChevronDown, Tag, Clock, Sparkles, Repeat } from 'lucide-react'
import type { Task } from '../../store'

interface Props {
  task?: Task | null
  onClose: () => void
}

const MAX_TAGS = 5

export default function TaskForm({ task, onClose }: Props) {
  const { projects, tags, tasks, createTask, updateTask, currentProjectId } = useAppStore()
  const isEdit = !!task

  const [title, setTitle] = useState(task?.title || '')
  const [description, setDescription] = useState(task?.description || '')
  const [priority, setPriority] = useState(task?.priority ?? 1)
  const [dueDate, setDueDate] = useState(task?.due_date || '')
  const [projectId, setProjectId] = useState<number | null>(isEdit ? (task?.project_id ?? null) : currentProjectId)
  const [parentId, setParentId] = useState<number | null>(task?.parent_id || null)
  const [recurrence, setRecurrence] = useState(task?.recurrence_rule || '')
  const [estimated, setEstimated] = useState(task?.estimated_minutes || 0)
  const [selectedTags, setSelectedTags] = useState<number[]>(task?.tags?.map((t) => t.id) || [])
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const priorityOptions = [
    { value: 0, label: '低', color: '#94a3b8' },
    { value: 1, label: '中', color: '#3b82f6' },
    { value: 2, label: '高', color: '#f59e0b' },
    { value: 3, label: '紧急', color: '#ef4444' },
  ]

  const recurrenceOptions = [
    { value: '', label: '不重复' },
    { value: 'daily', label: '每天' },
    { value: 'weekly', label: '每周' },
    { value: 'monthly', label: '每月' },
  ]

  // Collect all descendant IDs to prevent circular nesting
  function getDescendantIds(taskId: number, allTasks: { id: number; parent_id: number | null }[]): number[] {
    const children = allTasks.filter((t) => t.parent_id === taskId)
    return children.reduce<number[]>((acc, child) => [...acc, child.id, ...getDescendantIds(child.id, allTasks)], [])
  }

  const excludeIds = task ? [task.id, ...getDescendantIds(task.id, tasks)] : []
  const parentCandidates = tasks.filter((t) => !excludeIds.includes(t.id))

  const handleSubmit = async () => {
    if (!title.trim()) return
    setSubmitting(true)
    try {
      const data = {
        title: title.trim(),
        description,
        priority,
        due_date: dueDate || null,
        project_id: projectId,
        parent_id: parentId,
        recurrence_rule: recurrence || null,
        estimated_minutes: estimated,
        tag_ids: selectedTags,
      }
      if (isEdit) {
        await updateTask(task!.id, data)
      } else {
        await createTask(data)
      }
      onClose()
    } finally {
      setSubmitting(false)
    }
  }

  const toggleTag = (id: number) => {
    setSelectedTags((prev) => {
      if (prev.includes(id)) return prev.filter((t) => t !== id)
      if (prev.length >= MAX_TAGS) return prev
      return [...prev, id]
    })
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="mx-4 w-full max-w-lg rounded-2xl border border-border bg-surface shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <h2 className="font-display text-lg font-semibold">{isEdit ? '编辑任务' : '新建任务'}</h2>
            <button onClick={onClose} className="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-surface-hover hover:text-text">
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div className="space-y-4 px-6 py-5">
            {/* Title */}
            <input
              type="text"
              placeholder="任务标题"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSubmit()}
              className="w-full rounded-xl border border-border bg-bg px-4 py-3 text-base font-medium text-text placeholder-text-muted outline-none transition-colors focus:border-primary"
              autoFocus
            />

            {/* Description */}
            <textarea
              placeholder="添加描述..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full resize-none rounded-xl border border-border bg-bg px-4 py-3 text-sm text-text placeholder-text-muted outline-none transition-colors focus:border-primary"
            />

            {/* Priority */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-text-secondary">优先级</label>
              <div className="flex gap-2">
                {priorityOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setPriority(opt.value)}
                    className={`flex-1 rounded-lg border-2 py-2 text-xs font-medium transition-all ${
                      priority === opt.value
                        ? 'border-current shadow-sm'
                        : 'border-border text-text-muted hover:border-border'
                    }`}
                    style={priority === opt.value ? { borderColor: opt.color, color: opt.color, backgroundColor: opt.color + '10' } : {}}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Due date & Project */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-text-secondary">
                  <Calendar size={12} className="mr-1 inline" />截止日期
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text outline-none transition-colors focus:border-primary"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-text-secondary">所属项目</label>
                <select
                  value={projectId || ''}
                  onChange={(e) => setProjectId(e.target.value ? parseInt(e.target.value) : null)}
                  className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text outline-none transition-colors focus:border-primary"
                >
                  <option value="">无项目</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>{p.icon} {p.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Tags */}
            {tags.length > 0 && (
              <div>
                <label className="mb-1.5 flex items-center gap-1 text-xs font-medium text-text-secondary">
                  <Tag size={12} />标签
                  {selectedTags.length > 0 && (
                    <span className="ml-1 text-text-muted">({selectedTags.length}/{MAX_TAGS})</span>
                  )}
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((tag) => (
                    <button
                      key={tag.id}
                      onClick={() => toggleTag(tag.id)}
                      disabled={!selectedTags.includes(tag.id) && selectedTags.length >= MAX_TAGS}
                      className={`rounded-full px-2.5 py-1 text-xs font-medium transition-all ${
                        selectedTags.includes(tag.id) ? 'ring-1 ring-offset-1 ring-offset-surface' : 'opacity-60 hover:opacity-100'
                      } ${!selectedTags.includes(tag.id) && selectedTags.length >= MAX_TAGS ? 'cursor-not-allowed opacity-30' : ''}`}
                      style={{
                        backgroundColor: tag.color + '20',
                        color: tag.color,
                        ...(selectedTags.includes(tag.id) ? { ringColor: tag.color } : {}),
                      }}
                    >
                      #{tag.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Advanced toggle */}
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-1.5 text-xs font-medium text-text-muted transition-colors hover:text-primary"
            >
              <Sparkles size={12} />
              高级选项
              <ChevronDown size={12} className={`transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
            </button>

            {/* Advanced fields */}
            <AnimatePresence>
              {showAdvanced && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="space-y-3 overflow-hidden"
                >
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-text-secondary">
                        <Clock size={12} className="mr-1 inline" />预估时间(分钟)
                      </label>
                      <input
                        type="number"
                        value={estimated}
                        onChange={(e) => setEstimated(parseInt(e.target.value) || 0)}
                        min={0}
                        className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text outline-none transition-colors focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-text-secondary">
                        <Repeat size={12} className="mr-1 inline" />重复规则
                      </label>
                      <select
                        value={recurrence}
                        onChange={(e) => setRecurrence(e.target.value)}
                        className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text outline-none transition-colors focus:border-primary"
                      >
                        {recurrenceOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Parent task selector - unlimited nesting */}
                  {parentCandidates.length > 0 && (
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-text-secondary">父任务</label>
                      <select
                        value={parentId || ''}
                        onChange={(e) => setParentId(e.target.value ? parseInt(e.target.value) : null)}
                        className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text outline-none transition-colors focus:border-primary"
                      >
                        <option value="">无 (顶级任务)</option>
                        {parentCandidates.map((t) => {
                          const indent = t.parent_id ? '  └ ' : ''
                          return (
                            <option key={t.id} value={t.id}>{indent}{t.title}</option>
                          )
                        })}
                      </select>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
            <button
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-hover"
            >
              取消
            </button>
            <button
              onClick={handleSubmit}
              disabled={!title.trim() || submitting}
              className="rounded-lg bg-primary px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-50"
            >
              {submitting ? '保存中...' : isEdit ? '更新' : '创建'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
