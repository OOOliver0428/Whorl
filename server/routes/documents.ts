import { Router } from 'express'
import { z } from 'zod'
import { readdir, stat } from 'fs/promises'
import { join, extname, basename } from 'path'
import { createHash } from 'crypto'
import { readFileSync, existsSync } from 'fs'
import db from '../db.js'

const router = Router()

const MAX_SCAN_FILES = 500

function toWslPath(p: string): string {
  const match = p.match(/^([A-Z]):[\\/]/)
  if (match) {
    return '/mnt/' + match[1].toLowerCase() + p.slice(2).replace(/\\/g, '/')
  }
  return p
}

const DEFAULT_EXTENSIONS = [
  '.vsdx', '.pdf', '.png', '.md', '.drawio',
  '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  '.txt', '.csv', '.json', '.xml', '.yaml', '.yml',
  '.jpg', '.jpeg', '.gif', '.svg', '.webp',
]

// Validation schemas
const scanSchema = z.object({
  dir_path: z.string().min(1).max(1000),
  extensions: z.array(z.string()).optional(),
})

const importSchema = z.object({
  project_id: z.number().int().positive(),
  files: z.array(z.object({
    name: z.string().min(1),
    file_path: z.string().min(1),
    file_type: z.string().optional(),
    file_size: z.number().int().min(0).optional(),
    last_modified: z.string().optional(),
  })).min(1),
})

const updateDocumentSchema = z.object({
  name: z.string().min(1).max(500).optional(),
  description: z.string().max(2000).optional(),
  status: z.enum(['active', 'missing', 'changed']).optional(),
})

const checkChangesSchema = z.object({
  document_ids: z.array(z.number().int().positive()).min(1),
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

function computeFileHash(filePath: string): string {
  const content = readFileSync(filePath)
  return createHash('sha256').update(content).digest('hex')
}

async function walkDir(dirPath: string, extensions: string[]): Promise<string[]> {
  const results: string[] = []

  async function walk(current: string) {
    if (results.length >= MAX_SCAN_FILES) return
    const entries = await readdir(current, { withFileTypes: true })
    for (const entry of entries) {
      if (results.length >= MAX_SCAN_FILES) return
      if (entry.name.startsWith('.')) continue
      if (entry.name.startsWith('~$')) continue
      const fullPath = join(current, entry.name)
      if (entry.isDirectory()) {
        const skipDirs = ['node_modules', '.git', 'dist', '__pycache__', 'vendor']
        if (skipDirs.includes(entry.name)) continue
        await walk(fullPath)
      } else if (entry.isFile()) {
        const ext = extname(entry.name).toLowerCase()
        if (extensions.length === 0 || extensions.includes(ext)) {
          results.push(fullPath)
        }
      }
    }
  }

  await walk(dirPath)
  return results
}

// GET /api/documents?project_id=X&status=active&file_type=pdf&search=xxx
router.get('/', (req, res) => {
  const { project_id, status, file_type, search, sort } = req.query

  if (!project_id) {
    return res.status(400).json({ error: 'project_id is required' })
  }

  let sql = 'SELECT * FROM documents WHERE project_id = ?'
  const params: (string | number)[] = [project_id as string]

  if (status && typeof status === 'string') {
    sql += ' AND status = ?'
    params.push(status)
  }
  if (file_type && typeof file_type === 'string') {
    sql += ' AND file_type = ?'
    params.push(file_type)
  }
  if (search && typeof search === 'string') {
    sql += ' AND (name LIKE ? OR description LIKE ? OR file_path LIKE ?)'
    params.push(`%${search}%`, `%${search}%`, `%${search}%`)
  }

  if (sort === 'name') {
    sql += ' ORDER BY name ASC'
  } else if (sort === 'size') {
    sql += ' ORDER BY file_size DESC'
  } else if (sort === 'modified') {
    sql += ' ORDER BY last_modified DESC'
  } else {
    sql += ' ORDER BY created_at DESC'
  }

  const docs = db.prepare(sql).all(...params)
  res.json(docs)
})

// POST /api/documents — add single document metadata
router.post('/', validate(updateDocumentSchema.merge(z.object({
  project_id: z.number().int().positive(),
  file_path: z.string().min(1),
}))), (req, res) => {
  const { project_id, name, file_path, file_type, file_size, last_modified, file_hash, description } = req.body

  // Check duplicate
  const existing = db.prepare(
    'SELECT id FROM documents WHERE project_id = ? AND file_path = ?'
  ).get(project_id, file_path)
  if (existing) {
    return res.status(409).json({ error: '该文档已在文档池中' })
  }

  const result = db.prepare(`
    INSERT INTO documents (project_id, name, file_path, file_type, file_size, last_modified, file_hash, description)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(project_id, name, file_path, file_type || null, file_size || null, last_modified || null, file_hash || null, description || '')

  const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(result.lastInsertRowid)
  res.status(201).json(doc)
})

// PUT /api/documents/:id
router.put('/:id', validate(updateDocumentSchema), (req, res) => {
  const { name, description, status } = req.body
  const fields: string[] = []
  const params: (string | number)[] = []

  if (name !== undefined) { fields.push('name = ?'); params.push(name) }
  if (description !== undefined) { fields.push('description = ?'); params.push(description) }
  if (status !== undefined) { fields.push('status = ?'); params.push(status) }

  if (fields.length === 0) {
    return res.status(400).json({ error: 'No fields to update' })
  }

  fields.push("updated_at = datetime('now')")
  params.push(req.params.id)

  db.prepare(`UPDATE documents SET ${fields.join(', ')} WHERE id = ?`).run(...params)
  const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(req.params.id)

  if (!doc) return res.status(404).json({ error: 'Document not found' })
  res.json(doc)
})

// DELETE /api/documents/:id
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM documents WHERE id = ?').run(req.params.id)
  res.json({ success: true })
})

// POST /api/documents/scan — scan directory, return file list (not saved to DB)
router.post('/scan', validate(scanSchema), async (req, res) => {
  const dir_path = toWslPath(req.body.dir_path)
  const { extensions } = req.body

  if (!existsSync(dir_path)) {
    return res.status(400).json({ error: '目录不存在' })
  }

  const exts = (extensions && extensions.length > 0) ? extensions.map(e => e.startsWith('.') ? e.toLowerCase() : `.${e.toLowerCase()}`) : DEFAULT_EXTENSIONS

  try {
    const filePaths = await walkDir(dir_path, exts)
    const files: { name: string; file_path: string; file_type: string; file_size: number; last_modified: string }[] = []

    for (const fp of filePaths) {
      try {
        const s = await stat(fp)
        files.push({
          name: basename(fp),
          file_path: fp,
          file_type: extname(fp).toLowerCase().slice(1),
          file_size: s.size,
          last_modified: s.mtime.toISOString(),
        })
      } catch {
        // skip files that can't be read
      }
    }

    res.json({ files, total: files.length, truncated: filePaths.length >= MAX_SCAN_FILES })
  } catch (err: any) {
    res.status(500).json({ error: `扫描失败: ${err.message}` })
  }
})

// POST /api/documents/import — batch import from scan results
router.post('/import', validate(importSchema), (req, res) => {
  const { project_id, files } = req.body

  const insertStmt = db.prepare(`
    INSERT INTO documents (project_id, name, file_path, file_type, file_size, last_modified, file_hash)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)

  const checkDupStmt = db.prepare(
    'SELECT id FROM documents WHERE project_id = ? AND file_path = ?'
  )

  const imported: unknown[] = []
  const skipped: string[] = []

  const importAll = db.transaction(() => {
    for (const file of files) {
      const filePath = toWslPath(file.file_path)

      const existing = checkDupStmt.get(project_id, filePath) as { id: number } | undefined
      if (existing) {
        skipped.push(file.name)
        continue
      }

      let hash: string | null = null
      try {
        hash = computeFileHash(filePath)
      } catch {
        // hash computation failed, store null
      }

      const result = insertStmt.run(
        project_id,
        file.name,
        filePath,
        file.file_type || null,
        file.file_size || null,
        file.last_modified || null,
        hash,
      )

      const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(result.lastInsertRowid)
      imported.push(doc)
    }
  })

  importAll()

  res.status(201).json({ imported, skipped, imported_count: imported.length, skipped_count: skipped.length })
})

// POST /api/documents/check-changes — batch check file hash changes
router.post('/check-changes', validate(checkChangesSchema), (req, res) => {
  const { document_ids } = req.body

  const changes: { id: number; name: string; old_hash: string | null; new_hash: string | null; status: string }[] = []

  const checkAll = db.transaction(() => {
    for (const id of document_ids) {
      const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(id) as any
      if (!doc) continue

      if (!existsSync(doc.file_path)) {
        if (doc.status !== 'missing') {
          db.prepare("UPDATE documents SET status = 'missing', updated_at = datetime('now') WHERE id = ?").run(id)
        }
        changes.push({ id, name: doc.name, old_hash: doc.file_hash, new_hash: null, status: 'missing' })
        continue
      }

      try {
        const newHash = computeFileHash(doc.file_path)
        if (doc.file_hash && newHash !== doc.file_hash) {
          db.prepare("UPDATE documents SET status = 'changed', file_hash = ?, updated_at = datetime('now') WHERE id = ?").run(newHash, id)
          changes.push({ id, name: doc.name, old_hash: doc.file_hash, new_hash: newHash, status: 'changed' })
        } else if (doc.status !== 'active') {
          // File restored or hash matches, mark as active
          db.prepare("UPDATE documents SET status = 'active', file_hash = ?, updated_at = datetime('now') WHERE id = ?").run(newHash, id)
        }
      } catch {
        // can't read file
        if (doc.status !== 'missing') {
          db.prepare("UPDATE documents SET status = 'missing', updated_at = datetime('now') WHERE id = ?").run(id)
        }
        changes.push({ id, name: doc.name, old_hash: doc.file_hash, new_hash: null, status: 'missing' })
      }
    }
  })

  checkAll()

  res.json({ changes })
})

// POST /api/documents/:id/refresh — refresh single document hash
router.post('/:id/refresh', (req, res) => {
  const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(req.params.id) as any
  if (!doc) return res.status(404).json({ error: 'Document not found' })

  if (!existsSync(doc.file_path)) {
    db.prepare("UPDATE documents SET status = 'missing', updated_at = datetime('now') WHERE id = ?").run(doc.id)
    return res.status(400).json({ error: '文件不存在' })
  }

  try {
    const newHash = computeFileHash(doc.file_path)
    const s = stat(doc.file_path)
    db.prepare(`
      UPDATE documents SET file_hash = ?, file_size = ?, last_modified = ?, status = 'active', updated_at = datetime('now') WHERE id = ?
    `).run(newHash, s.size, s.mtime.toISOString(), doc.id)

    const updated = db.prepare('SELECT * FROM documents WHERE id = ?').get(doc.id)
    res.json(updated)
  } catch (err: any) {
    res.status(500).json({ error: `刷新失败: ${err.message}` })
  }
})

export default router
