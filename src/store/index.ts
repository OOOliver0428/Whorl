import { create } from 'zustand'
import { api, type CreateTaskData, type UpdateTaskData, type CreateProjectData, type UpdateProjectData, type CreateTagData, type UpdateTagData } from '../api'

export interface Task {
  id: number
  title: string
  description: string
  status: 'todo' | 'done'
  priority: number
  due_date: string | null
  project_id: number | null
  parent_id: number | null
  recurrence_rule: string | null
  estimated_minutes: number
  sort_order: number
  completed_at: string | null
  created_at: string
  updated_at: string
  project_name?: string
  project_color?: string
  project_icon?: string
  tags?: Tag[]
  subtasks?: Task[]
  subtask_count?: number
}

export interface Project {
  id: number
  name: string
  color: string
  icon: string
  archived: number
  todo_count: number
  done_count: number
  total_count: number
  created_at: string
}

export interface Tag {
  id: number
  name: string
  color: string
  task_count?: number
}

interface AppState {
  tasks: Task[]
  projects: Project[]
  tags: Tag[]
  loading: boolean

  viewMode: 'list' | 'timeline'
  timelineShowNoDate: boolean

  currentView: 'inbox' | 'today' | 'upcoming' | 'stats' | 'pomodoro' | 'project'
  currentProjectId: number | null
  searchQuery: string
  filterStatus: string | null
  filterPriority: number | null
  filterTags: number[]

  setView: (view: AppState['currentView'], projectId?: number | null) => void
  setViewMode: (mode: 'list' | 'timeline') => void
  setTimelineShowNoDate: (show: boolean) => void
  setSearchQuery: (q: string) => void
  setFilter: (key: 'status' | 'priority' | 'tags', value: string | number | number[] | null) => void

  fetchTasks: () => Promise<void>
  fetchProjects: () => Promise<void>
  fetchTags: () => Promise<void>
  createTask: (data: CreateTaskData) => Promise<Task>
  updateTask: (id: number, data: UpdateTaskData) => Promise<Task>
  deleteTask: (id: number) => Promise<void>
  toggleTask: (task: Task) => Promise<void>

  createProject: (data: CreateProjectData) => Promise<Project>
  updateProject: (id: number, data: UpdateProjectData) => Promise<Project>
  deleteProject: (id: number) => Promise<void>

  createTag: (data: CreateTagData) => Promise<Tag>
  updateTag: (id: number, data: UpdateTagData) => Promise<Tag>
  deleteTag: (id: number) => Promise<void>

  reorderTasks: (orders: { id: number; sort_order: number }[]) => Promise<void>
}

export const useAppStore = create<AppState>((set, get) => ({
  tasks: [],
  projects: [],
  tags: [],
  loading: false,

  currentView: 'inbox',
  currentProjectId: null,
  viewMode: 'list',
  timelineShowNoDate: false,
  searchQuery: '',
  filterStatus: null,
  filterPriority: null,
  filterTags: [],

  setView: (view, projectId) => set({ currentView: view, currentProjectId: projectId ?? null }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setTimelineShowNoDate: (show) => set({ timelineShowNoDate: show }),
  setSearchQuery: (q) => set({ searchQuery: q }),
  setFilter: (key, value) => set({ [`filter${key.charAt(0).toUpperCase() + key.slice(1)}`]: value }),

  fetchTasks: async () => {
    set({ loading: true })
    try {
      const { currentView, currentProjectId, searchQuery, filterStatus, filterPriority, filterTags, viewMode } = get()
      const params: Record<string, string> = {}

      if (searchQuery) params.search = searchQuery
      if (filterStatus) params.status = filterStatus
      if (filterPriority !== null) params.priority = String(filterPriority)
      if (filterTags.length > 0) params.tag_ids = filterTags.join(',')

      const today = new Date().toISOString().split('T')[0]

      if (currentView === 'today') {
        params.due_from = today
        params.due_to = today
        // Don't filter by parent_id - show subtasks due today too
      } else if (currentView === 'upcoming') {
        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        params.due_from = tomorrow.toISOString().split('T')[0]
        params.parent_id = 'null'
      } else if (currentView === 'project' && currentProjectId) {
        params.project_id = String(currentProjectId)
      } else {
        params.parent_id = 'null'
      }

      if (viewMode === 'timeline' && !params.due_from && !params.due_to) {
        const from = new Date()
        from.setMonth(from.getMonth() - 1)
        const to = new Date()
        to.setMonth(to.getMonth() + 3)
        params.due_from = from.toISOString().split('T')[0]
        params.due_to = to.toISOString().split('T')[0]
        delete params.parent_id
      }

      const tasks = await api.getTasks(params)
      set({ tasks })
    } finally {
      set({ loading: false })
    }
  },

  fetchProjects: async () => {
    const projects = await api.getProjects()
    set({ projects })
  },

  fetchTags: async () => {
    const tags = await api.getTags()
    set({ tags })
  },

  createTask: async (data) => {
    const task = await api.createTask(data)
    await get().fetchTasks()
    return task
  },

  updateTask: async (id, data) => {
    const task = await api.updateTask(id, data)
    const currentTasks = get().tasks
    // Optimistic: update the task in place if it exists
    const idx = currentTasks.findIndex((t) => t.id === id)
    if (idx !== -1) {
      const updated = { ...currentTasks[idx], ...task }
      set({ tasks: currentTasks.map((t, i) => (i === idx ? updated : t)) })
    }
    await get().fetchTasks()
    return task
  },

  deleteTask: async (id) => {
    // Optimistic: remove task immediately
    const prev = get().tasks
    set({ tasks: prev.filter((t) => t.id !== id) })
    try {
      await api.deleteTask(id)
    } catch {
      set({ tasks: prev }) // rollback
    }
  },

  toggleTask: async (task) => {
    const newStatus = task.status === 'done' ? 'todo' : 'done'
    // Optimistic: update immediately
    const prev = get().tasks
    set({
      tasks: prev.map((t) =>
        t.id === task.id
          ? { ...t, status: newStatus, completed_at: newStatus === 'done' ? new Date().toISOString() : null }
          : t
      ),
    })
    try {
      await api.updateTask(task.id, { status: newStatus })
      // Re-fetch to get server-set timestamps
      await get().fetchTasks()
    } catch {
      set({ tasks: prev }) // rollback
    }
  },

  createProject: async (data) => {
    const project = await api.createProject(data)
    await get().fetchProjects()
    return project
  },

  updateProject: async (id, data) => {
    const project = await api.updateProject(id, data)
    await get().fetchProjects()
    return project
  },

  deleteProject: async (id) => {
    await api.deleteProject(id)
    await get().fetchProjects()
  },

  createTag: async (data) => {
    const tag = await api.createTag(data)
    await get().fetchTags()
    return tag
  },

  updateTag: async (id, data) => {
    const tag = await api.updateTag(id, data)
    await get().fetchTags()
    return tag
  },

  deleteTag: async (id) => {
    await api.deleteTag(id)
    await get().fetchTags()
  },

  reorderTasks: async (orders) => {
    const prev = get().tasks
    const updated = prev.map((t) => {
      const o = orders.find((o) => o.id === t.id)
      return o ? { ...t, sort_order: o.sort_order } : t
    })
    set({ tasks: updated.sort((a, b) => a.sort_order - b.sort_order) })
    try {
      await api.reorderTasks(orders)
    } catch {
      set({ tasks: prev })
    }
  },
}))
