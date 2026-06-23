import { Router } from 'express'
import db from '../db.js'
import { z } from 'zod'

const router = Router()

const createProjectSchema = z.object({
  name: z.string().min(1).max(100),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#6366f1'),
  icon: z.string().max(10).default('📁'),
  parent_id: z.number().int().positive().nullable().optional(),
  sort_order: z.number().int().optional(),
})

const updateProjectSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  icon: z.string().max(10).optional(),
  archived: z.boolean().optional(),
  parent_id: z.number().int().positive().nullable().optional(),
  sort_order: z.number().int().optional(),
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

// Walks parent_id chain upward from parentId. Returns true if targetId is
// found in the chain — meaning parentId is a descendant of targetId.
function isDescendant(parentId: number, targetId: number, depth = 0): boolean {
  if (depth > 100) throw new Error('Project hierarchy depth exceeded (possible cycle)')
  const project = db.prepare('SELECT parent_id FROM projects WHERE id = ?').get(parentId) as { parent_id: number | null } | undefined
  if (!project || !project.parent_id) return false
  if (project.parent_id === targetId) return true
  return isDescendant(project.parent_id, targetId, depth + 1)
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

// Reorder projects (registered before /:id to avoid path conflicts)
router.post('/reorder', validate(reorderSchema), (req, res) => {
  const { orders } = req.body
  const stmt = db.prepare('UPDATE projects SET sort_order = ? WHERE id = ?')
  const tx = db.transaction((items: { id: number; sort_order: number }[]) => {
    for (const item of items) stmt.run(item.sort_order, item.id)
  })
  tx(orders)
  res.json({ success: true })
})

// Get single project
router.get('/:id', (req, res) => {
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id)
  if (!project) return res.status(404).json({ error: 'Project not found' })
  res.json(project)
})

// Create project
router.post('/', validate(createProjectSchema), (req, res) => {
  const { name, color, icon, parent_id, sort_order } = req.body

  if (parent_id !== null && parent_id !== undefined) {
    const parent = db.prepare('SELECT archived FROM projects WHERE id = ?').get(parent_id) as { archived: number } | undefined
    if (!parent) return res.status(400).json({ error: 'Parent project not found' })
    if (parent.archived) return res.status(400).json({ error: 'Cannot create subproject under an archived project' })
  }

  let finalSortOrder = sort_order
  if (finalSortOrder === undefined) {
    const maxOrder = db.prepare('SELECT MAX(sort_order) as m FROM projects WHERE parent_id IS ?').get(parent_id ?? null) as { m: number | null }
    finalSortOrder = (maxOrder.m ?? -1) + 1
  }

  const result = db.prepare('INSERT INTO projects (name, color, icon, parent_id, sort_order) VALUES (?, ?, ?, ?, ?)').run(name, color, icon, parent_id ?? null, finalSortOrder)
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(result.lastInsertRowid)
  res.status(201).json(project)
})

// Update project
router.put('/:id', validate(updateProjectSchema), (req, res) => {
  const { name, color, icon, archived, parent_id, sort_order } = req.body
  const id = Number(req.params.id)

  if (parent_id !== undefined && parent_id !== null) {
    if (parent_id === id) {
      return res.status(400).json({ error: 'Project cannot be its own parent' })
    }
    if (isDescendant(parent_id, id)) {
      return res.status(400).json({ error: 'Cannot move a project under its own descendant' })
    }
    const parent = db.prepare('SELECT archived FROM projects WHERE id = ?').get(parent_id) as { archived: number } | undefined
    if (!parent) return res.status(400).json({ error: 'Parent project not found' })
    if (parent.archived) return res.status(400).json({ error: 'Cannot move project under an archived project' })
  }

  const fields: string[] = []
  const params: (string | number | null)[] = []

  if (name !== undefined) { fields.push('name = ?'); params.push(name) }
  if (color !== undefined) { fields.push('color = ?'); params.push(color) }
  if (icon !== undefined) { fields.push('icon = ?'); params.push(icon) }
  if (archived !== undefined) { fields.push('archived = ?'); params.push(archived ? 1 : 0) }
  if (parent_id !== undefined) { fields.push('parent_id = ?'); params.push(parent_id) }
  if (sort_order !== undefined) { fields.push('sort_order = ?'); params.push(sort_order) }

  fields.push("updated_at = datetime('now')")
  params.push(req.params.id)

  db.prepare(`UPDATE projects SET ${fields.join(', ')} WHERE id = ?`).run(...params)
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id)
  res.json(project)
})

// Delete project — transaction: detach children, orphan tasks, delete project
router.delete('/:id', (req, res) => {
  const tx = db.transaction(() => {
    db.prepare('UPDATE projects SET parent_id = NULL WHERE parent_id = ?').run(req.params.id)
    db.prepare('UPDATE tasks SET project_id = NULL WHERE project_id = ?').run(req.params.id)
    db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.id)
  })
  tx()
  res.json({ success: true })
})

export default router
