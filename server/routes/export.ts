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

  const headers = ['id', 'title', 'description', 'status', 'phase', 'priority', 'due_date', 'project_name', 'tags', 'created_at', 'completed_at']
  const rows = tasks.map((t) => [
    t.id,
    escapeCsv(t.title),
    escapeCsv(t.description),
    t.status,
    escapeCsv(t.phase),
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

// Export tasks as Markdown (AI agent friendly)
router.get('/md', (_req, res) => {
  const tasks = db.prepare(`
    SELECT t.*, p.name as project_name, p.color as project_color,
      GROUP_CONCAT(tg.name) as tag_names
    FROM tasks t
    LEFT JOIN projects p ON t.project_id = p.id
    LEFT JOIN task_tags tt ON t.id = tt.task_id
    LEFT JOIN tags tg ON tt.tag_id = tg.id
    GROUP BY t.id
    ORDER BY t.project_id, t.sort_order ASC
  `).all() as any[]

  function localDate(): string {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  }

  const today = localDate()
  const todoCount = tasks.filter(t => t.status === 'todo').length
  const doneCount = tasks.filter(t => t.status === 'done').length
  const overdueCount = tasks.filter(t => t.status !== 'done' && t.due_date && t.due_date < today).length
  const todayDoneCount = tasks.filter(t => t.status === 'done' && t.completed_at && t.completed_at.startsWith(today)).length

  const groups: Record<string, any[]> = {}
  for (const t of tasks) {
    const key = t.project_name || '无项目'
    if (!groups[key]) groups[key] = []
    groups[key].push(t)
  }

  const priorityEmoji = ['⚪', '🔵', '🟡', '🔴']
  const now = new Date()
  const ts = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

  let md = `# Whorl 任务导出\n`
  md += `> 导出时间: ${ts}\n\n`
  md += `## 概览\n`
  md += `- 待办: ${todoCount} | 已完成: ${doneCount} | 逾期: ${overdueCount} | 今日完成: ${todayDoneCount}\n\n`

  for (const [projName, projTasks] of Object.entries(groups)) {
    const colorHex = projTasks[0]?.project_color || '#94a3b8'
    md += `## ${projName} \`${colorHex}\`\n\n`
    md += `| 状态 | 阶段 | 优先级 | 任务 | 截止日期 | 标签 | 备注 |\n`
    md += `|------|------|--------|------|----------|------|------|\n`
    for (const t of projTasks) {
      const status = t.status === 'done' ? '✅' : '⬜'
      const phase = t.phase || '-'
      const priority = priorityEmoji[t.priority] || '🔵'
      const due = t.due_date || '-'
      const tags = t.tag_names || ''
      const desc = (t.description || '').slice(0, 80).replace(/\n/g, ' ')
      md += `| ${status} | ${phase} | ${priority} | ${t.title} | ${due} | ${tags} | ${desc} |\n`
    }
    md += '\n'
  }

  res.setHeader('Content-Type', 'text/markdown; charset=utf-8')
  res.setHeader('Content-Disposition', 'attachment; filename="whorl-export.md"')
  res.send(md)
})

export default router
