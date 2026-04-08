import { Router } from 'express'
import db from '../db.js'
import { z } from 'zod'

const router = Router()

const createTagSchema = z.object({
  name: z.string().min(1).max(50),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#94a3b8'),
})

const updateTagSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
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

router.get('/', (_req, res) => {
  const tags = db.prepare(`
    SELECT t.*, (SELECT COUNT(*) FROM task_tags WHERE tag_id = t.id) as task_count
    FROM tags t ORDER BY t.name ASC
  `).all()
  res.json(tags)
})

router.post('/', validate(createTagSchema), (req, res) => {
  const { name, color } = req.body
  const result = db.prepare('INSERT INTO tags (name, color) VALUES (?, ?)').run(name, color)
  const tag = db.prepare('SELECT * FROM tags WHERE id = ?').get(result.lastInsertRowid)
  res.status(201).json(tag)
})

router.put('/:id', validate(updateTagSchema), (req, res) => {
  const { name, color } = req.body
  const fields: string[] = []
  const params: (string | number)[] = []

  if (name !== undefined) { fields.push('name = ?'); params.push(name) }
  if (color !== undefined) { fields.push('color = ?'); params.push(color) }

  params.push(req.params.id)
  db.prepare(`UPDATE tags SET ${fields.join(', ')} WHERE id = ?`).run(...params)
  const tag = db.prepare('SELECT * FROM tags WHERE id = ?').get(req.params.id)
  res.json(tag)
})

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM tags WHERE id = ?').run(req.params.id)
  res.json({ success: true })
})

export default router
