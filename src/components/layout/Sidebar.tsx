import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '../../store'
import { Inbox, CalendarDays, CalendarRange, BarChart3, Timer, Plus, Download, Tag, X } from 'lucide-react'
import { useState } from 'react'

const navItems = [
  { id: 'inbox' as const, label: '全部任务', desc: '所有未归档任务', icon: Inbox },
  { id: 'today' as const, label: '今日到期', desc: '截止日期为今天的任务', icon: CalendarDays },
  { id: 'upcoming' as const, label: '未来计划', desc: '截止日期在未来的任务', icon: CalendarRange },
  { id: 'stats' as const, label: '数据面板', desc: '统计与趋势', icon: BarChart3 },
  { id: 'pomodoro' as const, label: '番茄钟', desc: '专注计时器', icon: Timer },
]

export default function Sidebar() {
  const {
    currentView, currentProjectId, projects, tags, setView, createProject,
    createTag, deleteTag, setFilter, fetchTasks,
  } = useAppStore()
  const [showNewProject, setShowNewProject] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectColor, setNewProjectColor] = useState('#6366f1')
  const [showNewTag, setShowNewTag] = useState(false)
  const [newTagName, setNewTagName] = useState('')
  const [newTagColor, setNewTagColor] = useState('#94a3b8')

  const colors = ['#6366f1', '#ec4899', '#14b8a6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16']
  const tagColors = ['#94a3b8', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6', '#ec4899', '#06b6d4']

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return
    await createProject({ name: newProjectName.trim(), color: newProjectColor })
    setNewProjectName('')
    setShowNewProject(false)
  }

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return
    await createTag({ name: newTagName.trim(), color: newTagColor })
    setNewTagName('')
    setShowNewTag(false)
  }

  const handleDeleteTag = async (e: React.MouseEvent, tagId: number) => {
    e.stopPropagation()
    if (confirm('确定删除此标签？')) {
      await deleteTag(tagId)
    }
  }

  return (
    <aside className="flex w-64 flex-col border-r border-border bg-surface transition-colors duration-300">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5">
        <img src="/核桃.png" alt="Whorl" className="h-8 w-8" />
        <span className="font-display text-xl font-semibold tracking-tight text-text">Whorl</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-2">
        <div className="space-y-0.5">
          {navItems.map((item) => {
            const isActive = currentView === item.id
            return (
              <button
                key={item.id}
                onClick={() => setView(item.id)}
                className={`group flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-200 ${
                  isActive
                    ? 'bg-primary-subtle text-primary'
                    : 'text-text-secondary hover:bg-surface-hover hover:text-text'
                }`}
              >
                <item.icon size={18} className={`mt-0.5 shrink-0 ${isActive ? 'text-primary' : 'text-text-muted group-hover:text-text-secondary'}`} />
                <div className="flex flex-col text-left">
                  <span className="text-sm font-medium leading-snug">{item.label}</span>
                  <span className="text-[11px] leading-snug text-text-muted">{item.desc}</span>
                </div>
              </button>
            )
          })}
        </div>

        {/* Projects */}
        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between px-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">项目</span>
            <button
              onClick={() => setShowNewProject(!showNewProject)}
              className="rounded p-1 text-text-muted transition-colors hover:bg-surface-hover hover:text-text"
            >
              <Plus size={14} />
            </button>
          </div>

          <AnimatePresence>
            {showNewProject && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="mb-2 rounded-lg border border-border bg-bg p-3">
                  <input
                    type="text"
                    placeholder="项目名称"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateProject()}
                    className="mb-2 w-full rounded-md border border-border bg-surface px-2.5 py-1.5 text-sm text-text outline-none transition-colors focus:border-primary"
                    autoFocus
                  />
                  <div className="mb-2 flex gap-1.5">
                    {colors.map((c) => (
                      <button
                        key={c}
                        onClick={() => setNewProjectColor(c)}
                        className={`h-5 w-5 rounded-full transition-transform ${newProjectColor === c ? 'scale-125 ring-2 ring-offset-2 ring-offset-surface' : ''}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleCreateProject}
                      className="flex-1 rounded-md bg-primary px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-primary-hover"
                    >
                      创建
                    </button>
                    <button
                      onClick={() => setShowNewProject(false)}
                      className="rounded-md px-3 py-1 text-xs text-text-muted hover:text-text"
                    >
                      取消
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-0.5">
            {projects.filter((p) => !p.archived).map((project) => {
              const isActive = currentView === 'project' && currentProjectId === project.id
              return (
                <button
                  key={project.id}
                  onClick={() => setView('project', project.id)}
                  className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-200 ${
                    isActive
                      ? 'bg-primary-subtle text-primary'
                      : 'text-text-secondary hover:bg-surface-hover hover:text-text'
                  }`}
                >
                  <span
                    className="flex h-5 w-5 items-center justify-center rounded text-xs"
                    style={{ backgroundColor: project.color + '20', color: project.color }}
                  >
                    {project.icon}
                  </span>
                  <span className="flex-1 truncate text-left">{project.name}</span>
                  {project.total_count > 0 && (
                    <span className="text-xs text-text-muted">
                      {project.todo_count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Tags */}
        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between px-3">
            <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-text-muted">
              <Tag size={12} /> 标签
            </span>
            <button
              onClick={() => setShowNewTag(!showNewTag)}
              className="rounded p-1 text-text-muted transition-colors hover:bg-surface-hover hover:text-text"
            >
              <Plus size={14} />
            </button>
          </div>

          <AnimatePresence>
            {showNewTag && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="mb-2 rounded-lg border border-border bg-bg p-3">
                  <input
                    type="text"
                    placeholder="标签名称"
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateTag()}
                    className="mb-2 w-full rounded-md border border-border bg-surface px-2.5 py-1.5 text-sm text-text outline-none transition-colors focus:border-primary"
                    autoFocus
                  />
                  <div className="mb-2 flex gap-1.5">
                    {tagColors.map((c) => (
                      <button
                        key={c}
                        onClick={() => setNewTagColor(c)}
                        className={`h-5 w-5 rounded-full transition-transform ${newTagColor === c ? 'scale-125 ring-2 ring-offset-2 ring-offset-surface' : ''}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleCreateTag}
                      className="flex-1 rounded-md bg-primary px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-primary-hover"
                    >
                      创建
                    </button>
                    <button
                      onClick={() => setShowNewTag(false)}
                      className="rounded-md px-3 py-1 text-xs text-text-muted hover:text-text"
                    >
                      取消
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-0.5">
            {tags.map((tag) => (
              <div
                key={tag.id}
                onClick={() => {
                  setFilter('tags', [tag.id])
                  fetchTasks()
                }}
                className="group flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-text-secondary transition-all duration-200 hover:bg-surface-hover hover:text-text"
              >
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: tag.color }}
                />
                <span className="flex-1 truncate">#{tag.name}</span>
                {tag.task_count !== undefined && (
                  <span className="text-[10px] text-text-muted">{tag.task_count}</span>
                )}
                <button
                  onClick={(e) => handleDeleteTag(e, tag.id)}
                  className="rounded p-0.5 text-text-muted opacity-0 transition-all hover:text-danger group-hover:opacity-100"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </nav>

      {/* Footer */}
      <div className="border-t border-border px-3 py-3 space-y-2">
        <div className="flex gap-1.5">
          <a
            href="/api/export/json"
            download
            className="flex flex-1 items-center justify-center gap-1 rounded-md border border-border py-1.5 text-[11px] text-text-muted transition-colors hover:bg-surface-hover hover:text-text"
          >
            <Download size={12} /> JSON
          </a>
          <a
            href="/api/export/csv"
            download
            className="flex flex-1 items-center justify-center gap-1 rounded-md border border-border py-1.5 text-[11px] text-text-muted transition-colors hover:bg-surface-hover hover:text-text"
          >
            <Download size={12} /> CSV
          </a>
        </div>
        <div className="text-center text-xs text-text-muted">
          Whorl v1.1.1 · 数据存储于本地
        </div>
      </div>
    </aside>
  )
}
