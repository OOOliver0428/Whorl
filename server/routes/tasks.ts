import { Router } from 'express'
import db from '../db.js'
import { z } from 'zod'

const router = Router()

function getNextDueDate(baseDate: string, rule: string): string {
  const d = new Date(baseDate + 'T00:00:00')
  switch (rule) {
    case 'daily': d.setDate(d.getDate() + 1); break
    case 'weekly': d.setDate(d.getDate() + 7); break
    case 'monthly': d.setMonth(d.getMonth() + 1); break
    default: d.setDate(d.getDate() + 1)
  }
  return d.toISOString().split('T')[0]
}

// Validation schemas
const createTaskSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(5000).default(''),
  priority: z.number().int().min(0).max(3).default(1),
  due_date: z.string().nullable().default(null),
  project_id: z.number().int().positive().nullable().default(null),
  parent_id: z.number().int().positive().nullable().default(null),
  recurrence_rule: z.string().nullable().default(null),
  estimated_minutes: z.number().int().min(0).max(9999).default(0),
  tag_ids: z.array(z.number().int().positive()).default([]),
})

const updateTaskSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.enum(['todo', 'done']).optional(),
  priority: z.number().int().min(0).max(3).optional(),
  due_date: z.string().nullable().optional(),
  project_id: z.number().int().positive().nullable().optional(),
  parent_id: z.number().int().positive().nullable().optional(),
  recurrence_rule: z.string().nullable().optional(),
  estimated_minutes: z.number().int().min(0).max(9999).optional(),
  tag_ids: z.array(z.number().int().positive()).optional(),
})

const reorderSchema = z.object({
  orders: z.array(z.object({
    id: z.number().int().positive(),
    sort_order: z.number().int(),
  })).min(1),
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

const linkDocSchema = z.object({
  document_id: z.number().int().positive(),
  relation: z.enum(['reference', 'output']).default('reference'),
})

// List tasks with filters
router.get('/', (req, res) => {
  const { status, project_id, parent_id, search, priority, due_from, due_to, tag_id, tag_ids } = req.query

  let sql = `
    SELECT t.*, p.name as project_name, p.color as project_color, p.icon as project_icon,
    GROUP_CONCAT(tg.id) as tag_ids, GROUP_CONCAT(tg.name) as tag_names, GROUP_CONCAT(tg.color) as tag_colors,
    (SELECT COUNT(*) FROM tasks sub WHERE sub.parent_id = t.id) as subtask_count
    FROM tasks t
    LEFT JOIN projects p ON t.project_id = p.id
    LEFT JOIN task_tags tt ON t.id = tt.task_id
    LEFT JOIN tags tg ON tt.tag_id = tg.id
    WHERE 1=1
  `
  const params: (string | number)[] = []

  if (status && typeof status === 'string') { sql += ' AND t.status = ?'; params.push(status) }
  if (project_id && typeof project_id === 'string') { sql += ' AND t.project_id = ?'; params.push(project_id) }
  if (parent_id !== undefined && typeof parent_id === 'string') {
    if (parent_id === '' || parent_id === 'null') { sql += ' AND t.parent_id IS NULL' }
    else { sql += ' AND t.parent_id = ?'; params.push(parent_id) }
  }
  if (priority !== undefined && typeof priority === 'string') { sql += ' AND t.priority = ?'; params.push(priority) }
  if (due_from && typeof due_from === 'string') { sql += ' AND t.due_date >= ?'; params.push(due_from) }
  if (due_to && typeof due_to === 'string') { sql += ' AND t.due_date <= ?'; params.push(due_to) }
  if (search && typeof search === 'string') { sql += ' AND (t.title LIKE ? OR t.description LIKE ?)'; params.push(`%${search}%`, `%${search}%`) }
  if (tag_id && typeof tag_id === 'string') { sql += ' AND t.id IN (SELECT task_id FROM task_tags WHERE tag_id = ?)'; params.push(tag_id) }
  if (tag_ids && typeof tag_ids === 'string') {
    const ids = tag_ids.split(',').map(Number).filter(n => !isNaN(n))
    if (ids.length > 0) {
      const placeholders = ids.map(() => '?').join(',')
      sql += ` AND t.id IN (SELECT task_id FROM task_tags WHERE tag_id IN (${placeholders}) GROUP BY task_id HAVING COUNT(DISTINCT tag_id) = ?)`
      params.push(...ids, ids.length)
    }
  }

  sql += ' GROUP BY t.id ORDER BY t.sort_order ASC, t.created_at DESC'

  const rows = db.prepare(sql).all(...params) as Record<string, unknown>[]

  const tasks = rows.map(row => ({
    ...row,
    tags: row.tag_ids ? (row.tag_ids as string).split(',').map((id: string, i: number) => ({
      id: parseInt(id),
      name: (row.tag_names as string).split(',')[i],
      color: (row.tag_colors as string).split(',')[i],
    })) : [],
    tag_ids: undefined,
    tag_names: undefined,
    tag_colors: undefined,
  }))

  res.json(tasks)
})

// --- Task document associations (must be before /:id) ---

// GET /api/tasks/:id/documents
router.get('/:taskId/documents', (req, res) => {
  const taskId = req.params.taskId

  const rows = db.prepare(`
    SELECT td.id as link_id, td.relation, td.created_at as linked_at,
      d.id, d.name, d.file_path, d.file_type, d.file_size, d.status, d.description
    FROM task_documents td
    JOIN documents d ON td.document_id = d.id
    WHERE td.task_id = ?
    ORDER BY td.created_at DESC
  `).all(taskId) as any[]

  const references = rows.filter(r => r.relation === 'reference')
  const outputs = rows.filter(r => r.relation === 'output')

  res.json({ references, outputs })
})

// POST /api/tasks/:id/documents
router.post('/:taskId/documents', validate(linkDocSchema), (req, res) => {
  const taskId = req.params.taskId
  const { document_id, relation } = req.body

  const task = db.prepare('SELECT id FROM tasks WHERE id = ?').get(taskId)
  if (!task) return res.status(404).json({ error: 'Task not found' })

  const doc = db.prepare('SELECT id FROM documents WHERE id = ?').get(document_id)
  if (!doc) return res.status(404).json({ error: 'Document not found' })

  try {
    const result = db.prepare(
      'INSERT INTO task_documents (task_id, document_id, relation) VALUES (?, ?, ?)'
    ).run(taskId, document_id, relation)

    const link = db.prepare('SELECT * FROM task_documents WHERE id = ?').get(result.lastInsertRowid)
    res.status(201).json(link)
  } catch (err: any) {
    if (err.message.includes('UNIQUE constraint')) {
      return res.status(409).json({ error: '该文档已关联到此任务' })
    }
    throw err
  }
})

// DELETE /api/tasks/:taskId/documents/:docId
router.delete('/:taskId/documents/:docId', (req, res) => {
  const { taskId, docId } = req.params

  db.prepare('DELETE FROM task_documents WHERE task_id = ? AND document_id = ?').run(taskId, docId)
  res.json({ success: true })
})

// --- Task CRUD ---

// Get single task with subtasks
router.get('/:id', (req, res) => {
  const task = db.prepare(`
    SELECT t.*, p.name as project_name, p.color as project_color, p.icon as project_icon
    FROM tasks t LEFT JOIN projects p ON t.project_id = p.id
    WHERE t.id = ?
  `).get(req.params.id)

  if (!task) return res.status(404).json({ error: 'Task not found' })

  const tags = db.prepare(`
    SELECT tg.* FROM tags tg JOIN task_tags tt ON tg.id = tt.tag_id WHERE tt.task_id = ?
  `).all(req.params.id)

  const subtasks = db.prepare(`
    SELECT * FROM tasks WHERE parent_id = ? ORDER BY sort_order ASC, created_at ASC
  `).all(req.params.id)

  res.json({ ...task, tags, subtasks })
})

// Create task
router.post('/', validate(createTaskSchema), (req, res) => {
  const { title, description, priority, due_date, project_id, parent_id, recurrence_rule, estimated_minutes, tag_ids } = req.body

  const maxOrder = db.prepare('SELECT MAX(sort_order) as max FROM tasks').get() as { max: number | null }
  const sortOrder = (maxOrder.max || 0) + 1

  const result = db.prepare(`
    INSERT INTO tasks (title, description, priority, due_date, project_id, parent_id, recurrence_rule, estimated_minutes, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(title, description, priority, due_date, project_id, parent_id, recurrence_rule, estimated_minutes, sortOrder)

  // Attach tags
  const insertTag = db.prepare('INSERT OR IGNORE INTO task_tags (task_id, tag_id) VALUES (?, ?)')
  for (const tagId of tag_ids) {
    insertTag.run(result.lastInsertRowid, tagId)
  }

  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(result.lastInsertRowid)
  res.status(201).json(task)
})

// Update task
router.put('/:id', validate(updateTaskSchema), (req, res) => {
  const { title, description, status, priority, due_date, project_id, parent_id, recurrence_rule, estimated_minutes, tag_ids } = req.body

  const fields: string[] = []
  const params: (string | number | null)[] = []

  if (title !== undefined) { fields.push('title = ?'); params.push(title) }
  if (description !== undefined) { fields.push('description = ?'); params.push(description) }
  if (status !== undefined) { fields.push('status = ?'); params.push(status) }
  if (priority !== undefined) { fields.push('priority = ?'); params.push(priority) }
  if (due_date !== undefined) { fields.push('due_date = ?'); params.push(due_date) }
  if (project_id !== undefined) { fields.push('project_id = ?'); params.push(project_id) }
  if (parent_id !== undefined) { fields.push('parent_id = ?'); params.push(parent_id) }
  if (recurrence_rule !== undefined) { fields.push('recurrence_rule = ?'); params.push(recurrence_rule) }
  if (estimated_minutes !== undefined) { fields.push('estimated_minutes = ?'); params.push(estimated_minutes) }

  if (status === 'done') { fields.push("completed_at = datetime('now')") }
  else if (status && status !== 'done') { fields.push('completed_at = NULL') }

  if (fields.length > 0 || tag_ids !== undefined) {
    fields.push("updated_at = datetime('now')")
    params.push(req.params.id)

    db.prepare(`UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`).run(...params)
  }

  // Update tags if provided
  if (tag_ids !== undefined) {
    db.prepare('DELETE FROM task_tags WHERE task_id = ?').run(req.params.id)
    const insertTag = db.prepare('INSERT OR IGNORE INTO task_tags (task_id, tag_id) VALUES (?, ?)')
    for (const tagId of tag_ids) {
      insertTag.run(req.params.id, tagId)
    }
  }

  // Recurring task: when marked done with a recurrence_rule, create the next instance
  if (status === 'done') {
    const current = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id) as any
    if (current?.recurrence_rule) {
      const baseDate = current.due_date || new Date().toISOString().split('T')[0]
      const nextDue = getNextDueDate(baseDate, current.recurrence_rule)

      const maxOrder = db.prepare('SELECT MAX(sort_order) as max FROM tasks').get() as any
      const sortOrder = (maxOrder.max || 0) + 1

      const result = db.prepare(`
        INSERT INTO tasks (title, description, priority, due_date, project_id, parent_id, recurrence_rule, estimated_minutes, sort_order)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        current.title,
        current.description,
        current.priority,
        nextDue,
        current.project_id,
        current.parent_id,
        current.recurrence_rule,
        current.estimated_minutes,
        sortOrder,
      )

      // Copy tags
      const origTags = db.prepare('SELECT tag_id FROM task_tags WHERE task_id = ?').all(req.params.id) as any[]
      const insertTag = db.prepare('INSERT OR IGNORE INTO task_tags (task_id, tag_id) VALUES (?, ?)')
      for (const row of origTags) {
        insertTag.run(result.lastInsertRowid, row.tag_id)
      }
    }
  }

  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id)
  res.json(task)
})

// Delete task
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id)
  res.json({ success: true })
})

// Reorder tasks
router.post('/reorder', validate(reorderSchema), (req, res) => {
  const { orders } = req.body
  const stmt = db.prepare('UPDATE tasks SET sort_order = ? WHERE id = ?')
  const tx = db.transaction((items: { id: number; sort_order: number }[]) => {
    for (const item of items) stmt.run(item.sort_order, item.id)
  })
  tx(orders)
  res.json({ success: true })
})

export default router
