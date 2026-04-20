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

export interface TagStat {
  id: number
  name: string
  color: string
  count: number
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

export interface Document {
  id: number
  project_id: number
  name: string
  file_path: string
  file_type: string | null
  file_size: number | null
  last_modified: string | null
  file_hash: string | null
  description: string
  status: 'active' | 'missing' | 'changed'
  created_at: string
  updated_at: string
}

export interface ScannedFile {
  name: string
  file_path: string
  file_type: string
  file_size: number
  last_modified: string
}

export interface DocumentChange {
  id: number
  name: string
  old_hash: string | null
  new_hash: string | null
  status: string
}

export interface TaskDocumentLink {
  link_id: number
  relation: 'reference' | 'output'
  linked_at: string
  id: number
  name: string
  file_path: string
  file_type: string | null
  file_size: number | null
  status: string
  description: string
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
  getTagStats: (range?: string) => request<TagStat[]>(`/stats/tags${range ? `?range=${range}` : ''}`),
  getWeeklyStats: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : ''
    return request<{ week: string; count: number }[]>(`/stats/weekly${qs}`)
  },

  // Documents
  getDocuments: (params?: Record<string, string>) => {
    const qs = params ? '?' + new URLSearchParams(params).toString() : ''
    return request<Document[]>(`/documents${qs}`)
  },
  createDocument: (data: { project_id: number; name: string; file_path: string; file_type?: string; file_size?: number; last_modified?: string; file_hash?: string; description?: string }) =>
    request<Document>('/documents', { method: 'POST', body: JSON.stringify(data) }),
  updateDocument: (id: number, data: { name?: string; description?: string; status?: string }) =>
    request<Document>(`/documents/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteDocument: (id: number) =>
    request<{ success: boolean }>(`/documents/${id}`, { method: 'DELETE' }),
  scanDirectory: (dirPath: string, extensions?: string[]) =>
    request<{ files: ScannedFile[]; total: number; truncated: boolean }>('/documents/scan', {
      method: 'POST', body: JSON.stringify({ dir_path: dirPath, extensions }),
    }),
  importDocuments: (projectId: number, files: ScannedFile[]) =>
    request<{ imported: Document[]; skipped: string[]; imported_count: number; skipped_count: number }>('/documents/import', {
      method: 'POST', body: JSON.stringify({ project_id: projectId, files }),
    }),
  checkDocumentChanges: (documentIds: number[]) =>
    request<{ changes: DocumentChange[] }>('/documents/check-changes', {
      method: 'POST', body: JSON.stringify({ document_ids: documentIds }),
    }),
  refreshDocument: (id: number) =>
    request<Document>(`/documents/${id}/refresh`, { method: 'POST' }),

  // Task Documents
  getTaskDocuments: (taskId: number) =>
    request<{ references: TaskDocumentLink[]; outputs: TaskDocumentLink[] }>(`/tasks/${taskId}/documents`),
  linkTaskDocument: (taskId: number, documentId: number, relation: 'reference' | 'output') =>
    request<{ id: number; task_id: number; document_id: number; relation: string }>(`/tasks/${taskId}/documents`, {
      method: 'POST', body: JSON.stringify({ document_id: documentId, relation }),
    }),
  unlinkTaskDocument: (taskId: number, docId: number) =>
    request<{ success: boolean }>(`/tasks/${taskId}/documents/${docId}`, { method: 'DELETE' }),
}
