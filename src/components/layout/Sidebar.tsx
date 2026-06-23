import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore, type Project } from '../../store'
import { Inbox, CalendarDays, CalendarRange, BarChart3, Timer, Plus, Download, Tag, X, ChevronDown, ChevronRight, Pencil, Trash2, Archive } from 'lucide-react'
import { useState, useMemo } from 'react'
import ReminderBell from '../reminders/ReminderBell'

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
    updateProject, deleteProject,
    createTag, deleteTag, setFilter, fetchTasks,
  } = useAppStore()
  const [showNewProject, setShowNewProject] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectColor, setNewProjectColor] = useState('#6366f1')
  const [showNewTag, setShowNewTag] = useState(false)
  const [newTagName, setNewTagName] = useState('')
  const [newTagColor, setNewTagColor] = useState('#94a3b8')
  const [projectsExpanded, setProjectsExpanded] = useState(true)
  const [tagsExpanded, setTagsExpanded] = useState(true)
  const [expandMap, setExpandMap] = useState<Map<number, boolean>>(new Map())
  const [newProjectParentId, setNewProjectParentId] = useState<number | null>(null)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [editProjectName, setEditProjectName] = useState('')
  const [editProjectColor, setEditProjectColor] = useState('#6366f1')
  const [editProjectParentId, setEditProjectParentId] = useState<number | null>(null)

  const colors = ['#6366f1', '#ec4899', '#14b8a6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16']
  const tagColors = ['#94a3b8', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#14b8a6', '#ec4899', '#06b6d4']

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return
    await createProject({ name: newProjectName.trim(), color: newProjectColor, parent_id: newProjectParentId })
    setNewProjectName('')
    setNewProjectParentId(null)
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

  const { top, children } = useMemo(() => {
    const active = projects.filter(p => !p.archived)
    const topProjects = active.filter(p => !p.parent_id || !active.find(x => x.id === p.parent_id))
    const childrenMap = new Map<number, Project[]>()
    for (const p of active) {
      if (p.parent_id && active.find(x => x.id === p.parent_id)) {
        const list = childrenMap.get(p.parent_id) || []
        list.push(p)
        childrenMap.set(p.parent_id, list)
      }
    }
    return { top: topProjects, children: childrenMap }
  }, [projects])

  const toggleExpand = (id: number) => {
    setExpandMap(prev => {
      const next = new Map(prev)
      next.set(id, !(prev.get(id) ?? true))
      return next
    })
  }

  const getDescendantIds = (projectId: number): Set<number> => {
    const ids = new Set<number>()
    const collect = (id: number) => {
      const kids = children.get(id) || []
      for (const kid of kids) {
        ids.add(kid.id)
        collect(kid.id)
      }
    }
    collect(projectId)
    return ids
  }

  const handleEditProject = (project: Project) => {
    setEditingProject(project)
    setEditProjectName(project.name)
    setEditProjectColor(project.color)
    setEditProjectParentId(project.parent_id)
  }

  const handleSaveProject = async () => {
    if (!editingProject || !editProjectName.trim()) return
    await updateProject(editingProject.id, {
      name: editProjectName.trim(),
      color: editProjectColor,
      parent_id: editProjectParentId,
    })
    setEditingProject(null)
  }

  const handleDeleteProject = async () => {
    if (!editingProject) return
    if (confirm(`确定删除项目「${editingProject.name}」？子项目将变为顶级，任务将变为无项目。`)) {
      await deleteProject(editingProject.id)
      setEditingProject(null)
    }
  }

  const handleArchiveProject = async () => {
    if (!editingProject) return
    await updateProject(editingProject.id, { archived: true })
    setEditingProject(null)
  }

  const renderProjectNode = (project: Project, depth: number): React.ReactNode => {
    if (editingProject?.id === project.id) {
      const descendantIds = getDescendantIds(project.id)
      const indent = Math.min(depth * 1.5, 4.5)
      return (
        <div key={project.id} className="mb-2 rounded-lg border border-border bg-bg p-3" style={{ marginLeft: `${indent}rem` }}>
          <input
            type="text"
            placeholder="项目名称"
            value={editProjectName}
            onChange={(e) => setEditProjectName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSaveProject()}
            className="mb-2 w-full rounded-md border border-border bg-surface px-2.5 py-1.5 text-sm text-text outline-none transition-colors focus:border-primary"
            autoFocus
          />
          <div className="mb-2 flex gap-1.5">
            {colors.map((c) => (
              <button
                key={c}
                onClick={() => setEditProjectColor(c)}
                className={`h-5 w-5 rounded-full transition-transform ${editProjectColor === c ? 'scale-125 ring-2 ring-offset-2 ring-offset-surface' : ''}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <select
            value={editProjectParentId ?? ''}
            onChange={(e) => setEditProjectParentId(e.target.value ? Number(e.target.value) : null)}
            className="mb-2 w-full rounded-md border border-border bg-surface px-2.5 py-1.5 text-sm text-text outline-none transition-colors focus:border-primary"
          >
            <option value="">无 (顶级)</option>
            {projects.filter((p) => !p.archived && p.id !== project.id && !descendantIds.has(p.id)).map((p) => (
              <option key={p.id} value={p.id}>{p.icon} {p.name}</option>
            ))}
          </select>
          <div className="flex gap-2">
            <button
              onClick={handleSaveProject}
              className="flex-1 rounded-md bg-primary px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-primary-hover"
            >
              保存
            </button>
            <button
              onClick={handleArchiveProject}
              className="flex items-center gap-1 rounded-md px-3 py-1 text-xs text-text-muted transition-colors hover:text-text"
            >
              <Archive size={12} /> 归档
            </button>
            <button
              onClick={handleDeleteProject}
              className="flex items-center gap-1 rounded-md px-3 py-1 text-xs text-danger transition-colors hover:text-danger-hover"
            >
              <Trash2 size={12} />
            </button>
            <button
              onClick={() => setEditingProject(null)}
              className="rounded-md px-3 py-1 text-xs text-text-muted hover:text-text"
            >
              取消
            </button>
          </div>
        </div>
      )
    }

    const kids = children.get(project.id) || []
    const isExpanded = expandMap.get(project.id) ?? true
    const isActive = currentView === 'project' && currentProjectId === project.id
    const indent = Math.min(depth * 1.5, 4.5)

    return (
      <div key={project.id}>
        <div
          onClick={() => setView('project', project.id)}
          className={`group flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-200 ${
            isActive
              ? 'bg-primary-subtle text-primary'
              : 'text-text-secondary hover:bg-surface-hover hover:text-text'
          }`}
          style={{ paddingLeft: `${indent + 0.75}rem` }}
        >
          {kids.length > 0 ? (
            <button
              onClick={(e) => { e.stopPropagation(); toggleExpand(project.id) }}
              className="shrink-0 text-text-muted hover:text-text"
            >
              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
          ) : (
            <span className="w-[14px] shrink-0" />
          )}
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
          <button
            onClick={(e) => { e.stopPropagation(); handleEditProject(project) }}
            className="rounded p-0.5 text-text-muted opacity-0 transition-all hover:text-text group-hover:opacity-100"
          >
            <Pencil size={12} />
          </button>
        </div>
        {kids.length > 0 && isExpanded && (
          kids.sort((a, b) => a.sort_order - b.sort_order).map((kid) => renderProjectNode(kid, depth + 1))
        )}
      </div>
    )
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
            <button
              onClick={() => setProjectsExpanded(!projectsExpanded)}
              className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-text-muted transition-colors hover:text-text"
            >
              {projectsExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              项目
            </button>
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
                  <select
                    value={newProjectParentId ?? ''}
                    onChange={(e) => setNewProjectParentId(e.target.value ? Number(e.target.value) : null)}
                    className="mb-2 w-full rounded-md border border-border bg-surface px-2.5 py-1.5 text-sm text-text outline-none transition-colors focus:border-primary"
                  >
                    <option value="">无 (顶级)</option>
                    {projects.filter((p) => !p.archived).map((p) => (
                      <option key={p.id} value={p.id}>{p.icon} {p.name}</option>
                    ))}
                  </select>
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

          <AnimatePresence initial={false}>
            {projectsExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="space-y-0.5">
                  {top.sort((a, b) => a.sort_order - b.sort_order).map((project) => renderProjectNode(project, 0))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Tags */}
        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between px-3">
            <button
              onClick={() => setTagsExpanded(!tagsExpanded)}
              className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-text-muted transition-colors hover:text-text"
            >
              {tagsExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              <Tag size={12} /> 标签
            </button>
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

          <AnimatePresence initial={false}>
            {tagsExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
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
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </nav>

      {/* Reminders — always visible, outside scroll area */}
      <div className="border-t border-border px-3 py-2">
        <ReminderBell />
      </div>

      {/* Footer */}
      <div className="border-t border-border px-3 py-3 space-y-2">
        <div className="flex gap-1.5">
          <a
            href="/api/export/md"
            download
            className="flex flex-1 items-center justify-center gap-1 rounded-md border border-border py-1.5 text-[11px] text-text-muted transition-colors hover:bg-surface-hover hover:text-text"
          >
            <Download size={12} /> MD
          </a>
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
          Whorl v1.3.0 · 数据存储于本地
        </div>
      </div>
    </aside>
  )
}
