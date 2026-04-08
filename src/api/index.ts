import type { Task, Project, Tag } from '../store'

export interface PomodoroSession {
  id: number
  task_id: number | null
  task_title?: string
  started_at: string
  duration_minutes: number
  type: 'work' | 'break'
}

export interface OverviewStats {
  today_done: number
  total_todo: number
  overdue: number
  pomodoro_today: number
  total_days: number
}

export interface TrendItem {
  date: string
  count: number
}

export interface ProjectStat {
  id: number
  name: string
  color: string
  icon: string
  total: number
  done: number
}

export interface PriorityStat {
  priority: number
  total: number
  done: number
}

export interface HeatmapItem {
  date: string
  count: number
}

export interface TodayPomodoroStats {
  sessions: number
  total_minutes: number
}

export interface CreateTaskData {
  title: string
  description?: string
  priority?: number
  due_date?: string | null
  project_id?: number | null
  parent_id?: number | null
  recurrence_rule?: string | null
  estimated_minutes?: number
  tag_ids?: number[]
}

export interface UpdateTaskData {
  title?: string
  description?: string
  status?: 'todo' | 'done'
  priority?: number
  due_date?: string | null
  project_id?: number | null
  parent_id?: number | null
  recurrence_rule?: string | null
  estimated_minutes?: number
  tag_ids?: number[]
}

export interface CreateProjectData {
  name: string
  color?: string
  icon?: string
}

export interface UpdateProjectData {
  name?: string
  color?: string
  icon?: string
  archived?: boolean
}

export interface CreateTagData {
  name: string
  color?: string
}

export interface UpdateTagData {
  name?: string
  color?: string
}

export interface CreateSessionData {
  task_id?: number | null
  duration_minutes?: number
  type?: 'work' | 'break'
}

const BASE = '/api'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || 'Request failed')
  }
  return res.json()
}

export const api = {
  // Tasks
  getTasks: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : ''
    return request<Task[]>(`/tasks${qs}`)
  },
  getTask: (id: number) => request<Task>(`/tasks/${id}`),
  createTask: (data: CreateTaskData) => request<Task>('/tasks', { method: 'POST', body: JSON.stringify(data) }),
  updateTask: (id: number, data: UpdateTaskData) => request<Task>(`/tasks/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTask: (id: number) => request<{ success: boolean }>(`/tasks/${id}`, { method: 'DELETE' }),
  reorderTasks: (orders: { id: number; sort_order: number }[]) =>
    request<{ success: boolean }>('/tasks/reorder', { method: 'POST', body: JSON.stringify({ orders }) }),

  // Projects
  getProjects: () => request<Project[]>('/projects'),
  createProject: (data: CreateProjectData) => request<Project>('/projects', { method: 'POST', body: JSON.stringify(data) }),
  updateProject: (id: number, data: UpdateProjectData) => request<Project>(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteProject: (id: number) => request<{ success: boolean }>(`/projects/${id}`, { method: 'DELETE' }),

  // Tags
  getTags: () => request<Tag[]>('/tags'),
  createTag: (data: CreateTagData) => request<Tag>('/tags', { method: 'POST', body: JSON.stringify(data) }),
  updateTag: (id: number, data: UpdateTagData) => request<Tag>(`/tags/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTag: (id: number) => request<{ success: boolean }>(`/tags/${id}`, { method: 'DELETE' }),

  // Pomodoro
  getSessions: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : ''
    return request<PomodoroSession[]>(`/pomodoro${qs}`)
  },
  createSession: (data: CreateSessionData) => request<PomodoroSession>('/pomodoro', { method: 'POST', body: JSON.stringify(data) }),
  getTodayPomodoro: () => request<TodayPomodoroStats>('/pomodoro/today'),

  // Stats
  getOverview: () => request<OverviewStats>('/stats/overview'),
  getTrend: (range?: number) => request<TrendItem[]>(`/stats/trend${range ? `?range=${range}` : ''}`),
  getProjectStats: () => request<ProjectStat[]>('/stats/projects'),
  getPriorityStats: () => request<PriorityStat[]>('/stats/priority'),
  getHeatmap: (year?: number) => request<HeatmapItem[]>(`/stats/heatmap${year ? `?year=${year}` : ''}`),
  getWeeklyStats: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : ''
    return request<{ week: string; count: number }[]>(`/stats/weekly${qs}`)
  },
}
