import { Router } from 'express'
import db from '../db.js'

const router = Router()

// Export all data as JSON
router.get('/json', (_req, res) => {
  const tasks = db.prepare('SELECT * FROM tasks ORDER BY sort_order ASC, created_at DESC').all()
  const projects = db.prepare('SELECT * FROM projects ORDER BY created_at ASC').all()
  const tags = db.prepare('SELECT * FROM tags ORDER BY name ASC').all()
  const taskTags = db.prepare('SELECT * FROM task_tags').all()
  const pomodoroSessions = db.prepare('SELECT * FROM pomodoro_sessions ORDER BY started_at DESC').all()

  const data = {
    version: '1.0.0',
    exported_at: new Date().toISOString(),
    data: { projects, tags, tasks, task_tags: taskTags, pomodoro_sessions: pomodoroSessions },
  }

  res.setHeader('Content-Disposition', 'attachment; filename="whorl-export.json"')
  res.json(data)
})

// Export tasks as CSV
router.get('/csv', (_req, res) => {
  const tasks = db.prepare(`
    SELECT t.*, p.name as project_name, GROUP_CONCAT(tg.name) as tag_names
    FROM tasks t
    LEFT JOIN projects p ON t.project_id = p.id
    LEFT JOIN task_tags tt ON t.id = tt.task_id
    LEFT JOIN tags tg ON tt.tag_id = tg.id
    GROUP BY t.id
    ORDER BY t.sort_order ASC
  `).all() as any[]

  function escapeCsv(value: unknown): string {
    const str = String(value ?? '')
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  }

  const headers = ['id', 'title', 'description', 'status', 'priority', 'due_date', 'project_name', 'tags', 'created_at', 'completed_at']
  const rows = tasks.map((t) => [
    t.id,
    escapeCsv(t.title),
    escapeCsv(t.description),
    t.status,
    t.priority,
    escapeCsv(t.due_date),
    escapeCsv(t.project_name),
    escapeCsv(t.tag_names),
    t.created_at,
    escapeCsv(t.completed_at),
  ])

  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
  const bom = '\uFEFF' // UTF-8 BOM for Excel compatibility

  res.setHeader('Content-Type', 'text/csv; charset=utf-8')
  res.setHeader('Content-Disposition', 'attachment; filename="whorl-tasks.csv"')
  res.send(bom + csv)
})

export default router
