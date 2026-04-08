import { useState, useCallback } from 'react'
import { useAppStore } from '../../store'
import { useThemeStore } from '../../store/theme'
import { Search, Plus, Sun, Moon, Filter, X, List, GanttChart, Tag } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const viewTitles: Record<string, string> = {
  inbox: '全部任务',
  today: '今日到期',
  upcoming: '未来计划',
  stats: '数据面板',
  pomodoro: '番茄钟',
  project: '项目',
}

const MAX_TAG_FILTERS = 5

interface Props {
  onAddTask: () => void
}

export default function Header({ onAddTask }: Props) {
  const {
    currentView, currentProjectId, projects, tags, viewMode, setViewMode,
    searchQuery, setSearchQuery, filterStatus, filterPriority, filterTags,
    setFilter, fetchTasks,
  } = useAppStore()
  const { theme, toggle: toggleTheme } = useThemeStore()
  const [showFilters, setShowFilters] = useState(false)
  const [localSearch, setLocalSearch] = useState(searchQuery)
  const [debounceTimer, setDebounceTimer] = useState<ReturnType<typeof setTimeout> | null>(null)

  const projectName = currentView === 'project' && currentProjectId
    ? projects.find((p) => p.id === currentProjectId)?.name
    : null

  const title = projectName || viewTitles[currentView] || 'Whorl'

  const isTaskView = ['inbox', 'today', 'upcoming', 'project'].includes(currentView)

  const hasActiveFilters = filterStatus || filterPriority !== null || filterTags.length > 0

  const handleSearch = useCallback((value: string) => {
    setLocalSearch(value)
    if (debounceTimer) clearTimeout(debounceTimer)
    const timer = setTimeout(() => {
      setSearchQuery(value)
      fetchTasks()
    }, 300)
    setDebounceTimer(timer)
  }, [debounceTimer, setSearchQuery, fetchTasks])

  const handleViewModeChange = (mode: 'list' | 'timeline') => {
    setViewMode(mode)
    setTimeout(() => fetchTasks(), 0)
  }

  const toggleTagFilter = (tagId: number) => {
    const current = filterTags
    if (current.includes(tagId)) {
      setFilter('tags', current.filter((id) => id !== tagId))
    } else if (current.length < MAX_TAG_FILTERS) {
      setFilter('tags', [...current, tagId])
    }
    fetchTasks()
  }

  return (
    <header className="flex items-center justify-between border-b border-border bg-surface px-6 py-4 transition-colors duration-300">
      <div className="flex items-center gap-4">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-text">{title}</h1>
        {currentView === 'project' && currentProjectId && (
          <span
            className="rounded-full px-2.5 py-0.5 text-xs font-medium"
            style={{
              backgroundColor: (projects.find((p) => p.id === currentProjectId)?.color || '#6366f1') + '20',
              color: projects.find((p) => p.id === currentProjectId)?.color || '#6366f1',
            }}
          >
            项目
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        {/* Search */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="搜索任务..."
            value={localSearch}
            onChange={(e) => handleSearch(e.target.value)}
            className="h-9 w-52 rounded-lg border border-border bg-bg pl-9 pr-3 text-sm text-text placeholder-text-muted outline-none transition-all duration-200 focus:w-72 focus:border-primary"
          />
          {localSearch && (
            <button
              onClick={() => handleSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-text-muted hover:text-text"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Filter toggle */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`relative flex h-9 w-9 items-center justify-center rounded-lg border transition-colors ${
            showFilters ? 'border-primary bg-primary-subtle text-primary' : 'border-border text-text-muted hover:bg-surface-hover hover:text-text'
          }`}
        >
          <Filter size={16} />
          {filterTags.length > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-white">
              {filterTags.length}
            </span>
          )}
        </button>

        {/* View mode toggle — only in task views */}
        {isTaskView && (
          <div className="flex h-9 overflow-hidden rounded-lg border border-border">
            <button
              onClick={() => handleViewModeChange('list')}
              className={`flex items-center gap-1 px-3 text-xs font-medium transition-colors ${
                viewMode === 'list' ? 'bg-primary text-white' : 'bg-surface text-text-muted hover:bg-surface-hover hover:text-text'
              }`}
            >
              <List size={14} /> 列表
            </button>
            <button
              onClick={() => handleViewModeChange('timeline')}
              className={`flex items-center gap-1 px-3 text-xs font-medium transition-colors ${
                viewMode === 'timeline' ? 'bg-primary text-white' : 'bg-surface text-text-muted hover:bg-surface-hover hover:text-text'
              }`}
            >
              <GanttChart size={14} /> 时间线
            </button>
          </div>
        )}

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-text-muted transition-colors hover:bg-surface-hover hover:text-text"
        >
          <motion.div key={theme} initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} transition={{ duration: 0.2 }}>
            {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
          </motion.div>
        </button>

        {/* Add task */}
        <button
          onClick={onAddTask}
          className="flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary-hover"
        >
          <Plus size={16} />
          新建
        </button>
      </div>

      {/* Filter bar */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="absolute left-64 right-0 top-[65px] z-10 border-b border-border bg-surface px-6 py-3"
          >
            <div className="flex items-center gap-4">
              <span className="text-xs font-medium text-text-muted">筛选:</span>
              <select
                value={filterStatus || ''}
                onChange={(e) => {
                  setFilter('status', e.target.value || null)
                  fetchTasks()
                }}
                className="h-8 rounded-md border border-border bg-bg px-2 text-xs text-text outline-none"
              >
                <option value="">全部状态</option>
                <option value="todo">未完成</option>
                <option value="done">已完成</option>
              </select>
              <select
                value={filterPriority ?? ''}
                onChange={(e) => {
                  const v = e.target.value ? parseInt(e.target.value) : null
                  setFilter('priority', v)
                  fetchTasks()
                }}
                className="h-8 rounded-md border border-border bg-bg px-2 text-xs text-text outline-none"
              >
                <option value="">全部优先级</option>
                <option value="0">低</option>
                <option value="1">中</option>
                <option value="2">高</option>
                <option value="3">紧急</option>
              </select>
              {tags.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <Tag size={12} className="text-text-muted" />
                  {tags.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => toggleTagFilter(t.id)}
                      className={`rounded-full px-2 py-0.5 text-[11px] font-medium transition-all ${
                        filterTags.includes(t.id) ? 'ring-1' : 'opacity-50 hover:opacity-100'
                      }`}
                      style={{
                        backgroundColor: t.color + '20',
                        color: t.color,
                        ...(filterTags.includes(t.id) ? { ringColor: t.color } : {}),
                      }}
                    >
                      #{t.name}
                    </button>
                  ))}
                  {filterTags.length > 0 && (
                    <span className="text-[10px] text-text-muted">
                      {filterTags.length}/{MAX_TAG_FILTERS}
                    </span>
                  )}
                </div>
              )}
              {hasActiveFilters && (
                <button
                  onClick={() => {
                    setFilter('status', null)
                    setFilter('priority', null)
                    setFilter('tags', [])
                    fetchTasks()
                  }}
                  className="text-xs text-text-muted hover:text-primary"
                >
                  清除筛选
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
