import { Router } from 'express'
import db from '../db.js'
import { z } from 'zod'

const router = Router()

const createSessionSchema = z.object({
  task_id: z.number().int().positive().nullable().default(null),
  duration_minutes: z.number().int().min(1).max(120).default(25),
  type: z.enum(['work', 'break']).default('work'),
})

function validate<T extends z.ZodTypeAny>(schema: T) {
  return (req: any, res: any, next: any) => {
    const result = schema.safeParse(req.body)
    if (!result.success) {
      const msg = result.error.issues.map((i: any) => i.message).join(', ')
      return res.status(400).json({ error: msg })
    }
    req.body = result.data
    next()
  }
}

// Get sessions
router.get('/', (req, res) => {
  const { date, task_id, limit = '50' } = req.query
  let sql = 'SELECT ps.*, t.title as task_title FROM pomodoro_sessions ps LEFT JOIN tasks t ON ps.task_id = t.id WHERE 1=1'
  const params: (string | number)[] = []

  if (date && typeof date === 'string') { sql += ' AND date(ps.started_at) = date(?)'; params.push(date) }
  if (task_id && typeof task_id === 'string') { sql += ' AND ps.task_id = ?'; params.push(task_id) }

  sql += ' ORDER BY ps.started_at DESC LIMIT ?'
  params.push(parseInt(limit as string))

  res.json(db.prepare(sql).all(...params))
})

// Start session
router.post('/', validate(createSessionSchema), (req, res) => {
  const { task_id, duration_minutes, type } = req.body
  const result = db.prepare(
    'INSERT INTO pomodoro_sessions (task_id, duration_minutes, type) VALUES (?, ?, ?)'
  ).run(task_id, duration_minutes, type)
  const session = db.prepare('SELECT * FROM pomodoro_sessions WHERE id = ?').get(result.lastInsertRowid)
  res.status(201).json(session)
})

// Today's stats
router.get('/today', (_req, res) => {
  const today = new Date().toISOString().split('T')[0]
  const workSessions = db.prepare(
    "SELECT COUNT(*) as count FROM pomodoro_sessions WHERE type = 'work' AND date(started_at) = date(?)"
  ).get(today) as { count: number }
  const totalMinutes = db.prepare(
    "SELECT COALESCE(SUM(duration_minutes), 0) as total FROM pomodoro_sessions WHERE type = 'work' AND date(started_at) = date(?)"
  ).get(today) as { total: number }

  res.json({ sessions: workSessions.count, total_minutes: totalMinutes.total })
})

export default router
