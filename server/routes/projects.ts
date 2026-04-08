import { Router } from 'express'
import db from '../db.js'
import { z } from 'zod'

const router = Router()

const createProjectSchema = z.object({
  name: z.string().min(1).max(100),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#6366f1'),
  icon: z.string().max(10).default('📁'),
})

const updateProjectSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  icon: z.string().max(10).optional(),
  archived: z.boolean().optional(),
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

// List projects with task counts
router.get('/', (_req, res) => {
  const projects = db.prepare(`
    SELECT p.*,
      (SELECT COUNT(*) FROM tasks WHERE project_id = p.id AND status != 'done') as todo_count,
      (SELECT COUNT(*) FROM tasks WHERE project_id = p.id AND status = 'done') as done_count,
      (SELECT COUNT(*) FROM tasks WHERE project_id = p.id) as total_count
    FROM projects p ORDER BY p.created_at ASC
  `).all()
  res.json(projects)
})

// Get single project
router.get('/:id', (req, res) => {
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id)
  if (!project) return res.status(404).json({ error: 'Project not found' })
  res.json(project)
})

// Create project
router.post('/', validate(createProjectSchema), (req, res) => {
  const { name, color, icon } = req.body

  const result = db.prepare('INSERT INTO projects (name, color, icon) VALUES (?, ?, ?)').run(name, color, icon)
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(result.lastInsertRowid)
  res.status(201).json(project)
})

// Update project
router.put('/:id', validate(updateProjectSchema), (req, res) => {
  const { name, color, icon, archived } = req.body
  const fields: string[] = []
  const params: (string | number)[] = []

  if (name !== undefined) { fields.push('name = ?'); params.push(name) }
  if (color !== undefined) { fields.push('color = ?'); params.push(color) }
  if (icon !== undefined) { fields.push('icon = ?'); params.push(icon) }
  if (archived !== undefined) { fields.push('archived = ?'); params.push(archived ? 1 : 0) }

  fields.push("updated_at = datetime('now')")
  params.push(req.params.id)

  db.prepare(`UPDATE projects SET ${fields.join(', ')} WHERE id = ?`).run(...params)
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id)
  res.json(project)
})

// Delete project
router.delete('/:id', (req, res) => {
  // Move tasks to no project
  db.prepare('UPDATE tasks SET project_id = NULL WHERE project_id = ?').run(req.params.id)
  db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.id)
  res.json({ success: true })
})

export default router
