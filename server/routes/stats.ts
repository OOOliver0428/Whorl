import { Router } from 'express'
import db from '../db.js'

const router = Router()

// Overview stats
router.get('/overview', (_req, res) => {
  const today = new Date().toISOString().split('T')[0]

  const todayDone = db.prepare(
    "SELECT COUNT(*) as count FROM tasks WHERE status = 'done' AND date(completed_at) = date(?)"
  ).get(today) as any

  const totalTodo = db.prepare(
    "SELECT COUNT(*) as count FROM tasks WHERE status = 'todo'"
  ).get() as any

  const overdue = db.prepare(
    "SELECT COUNT(*) as count FROM tasks WHERE status != 'done' AND due_date IS NOT NULL AND due_date < ?"
  ).get(today) as any

  const pomodoroToday = db.prepare(
    "SELECT COUNT(*) as count FROM pomodoro_sessions WHERE type = 'work' AND date(started_at) = date(?)"
  ).get(today) as any

  // Calculate total days with completed tasks (cumulative, not consecutive)
  const totalDays = db.prepare(
    "SELECT COUNT(DISTINCT date(completed_at)) as count FROM tasks WHERE status = 'done'"
  ).get() as any

  res.json({
    today_done: todayDone.count,
    total_todo: totalTodo.count,
    overdue: overdue.count,
    pomodoro_today: pomodoroToday.count,
    total_days: totalDays.count,
  })
})

// Completion trend (last N days)
router.get('/trend', (req, res) => {
  const range = parseInt(req.query.range as string) || 30
  const rows = db.prepare(`
    SELECT date(completed_at) as date, COUNT(*) as count
    FROM tasks
    WHERE status = 'done' AND completed_at >= date('now', '-' || ? || ' days')
    GROUP BY date(completed_at)
    ORDER BY date ASC
  `).all(range)
  res.json(rows)
})

// Project distribution
router.get('/projects', (_req, res) => {
  // Tasks with a project
  const withProject = db.prepare(`
    SELECT p.id, p.name, p.color, p.icon,
      COUNT(t.id) as total,
      SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END) as done
    FROM projects p
    INNER JOIN tasks t ON t.project_id = p.id
    GROUP BY p.id
    HAVING total > 0
    ORDER BY total DESC
  `).all() as any[]

  // Tasks without a project → "其他"
  const noProject = db.prepare(`
    SELECT
      0 as id, '其他' as name, '#94a3b8' as color, '📋' as icon,
      COUNT(*) as total,
      SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) as done
    FROM tasks
    WHERE project_id IS NULL
  `).get() as any

  const result = [...withProject]
  if (noProject && noProject.total > 0) result.push(noProject)

  res.json(result)
})

// Priority distribution
router.get('/priority', (_req, res) => {
  const rows = db.prepare(`
    SELECT priority,
      COUNT(*) as total,
      SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) as done
    FROM tasks
    GROUP BY priority
    ORDER BY priority ASC
  `).all()
  res.json(rows)
})

// Heatmap (daily completion counts for a year)
router.get('/heatmap', (req, res) => {
  const year = parseInt(req.query.year as string) || new Date().getFullYear()
  const rows = db.prepare(`
    SELECT date(completed_at) as date, COUNT(*) as count
    FROM tasks
    WHERE status = 'done' AND completed_at >= ? AND completed_at < ?
    GROUP BY date(completed_at)
  `).all(`${year}-01-01`, `${year + 1}-01-01`)
  res.json(rows)
})

// Weekly completion stats for project drill-down
router.get('/weekly', (req, res) => {
  const { project_id, weeks = '12' } = req.query
  const weeksNum = parseInt(weeks as string)

  let sql = `
    SELECT
      strftime('%Y-W%W', completed_at) as week,
      COUNT(*) as count
    FROM tasks
    WHERE status = 'done' AND completed_at >= date('now', '-' || ? || ' days')
  `
  const params: any[] = []
  params.push(weeksNum * 7)
  if (project_id) { sql += ' AND project_id = ?'; params.push(project_id) }
  sql += ' GROUP BY week ORDER BY week ASC'

  res.json(db.prepare(sql).all(...params))
})

export default router
