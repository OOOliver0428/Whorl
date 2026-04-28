import { api } from '../client.js'
import { parse, toQueryString } from '../args.js'
import { confirmDelete } from '../guard.js'

type Handler = (args: string[]) => Promise<void>

export const read: Record<string, Handler> = {
  async list(args) {
    const { flags } = parse(args)
    await api('GET', '/api/tasks' + toQueryString(flags))
  },

  async get(args) {
    const { positional } = parse(args)
    await api('GET', `/api/tasks/${positional[0]}`)
  },

  async documents(args) {
    const { positional } = parse(args)
    await api('GET', `/api/tasks/${positional[0]}/documents`)
  },
}

export const write: Record<string, Handler> = {
  async create(args) {
    const { flags } = parse(args)
    const body: Record<string, unknown> = {}
    if (flags.title) body.title = flags.title
    if (flags.description) body.description = flags.description
    if (flags.priority) body.priority = parseInt(flags.priority as string)
    if (flags['due-date']) body.due_date = flags['due-date']
    if (flags['project-id']) body.project_id = parseInt(flags['project-id'] as string)
    if (flags['parent-id']) body.parent_id = parseInt(flags['parent-id'] as string)
    if (flags['estimated-minutes']) body.estimated_minutes = parseInt(flags['estimated-minutes'] as string)
    if (flags.recurrence) body.recurrence_rule = flags.recurrence
    if (flags['tag-ids']) body.tag_ids = (flags['tag-ids'] as string).split(',').map(Number)
    await api('POST', '/api/tasks', body)
  },

  async update(args) {
    const { positional, flags } = parse(args)
    const id = positional[0]
    const body: Record<string, unknown> = {}
    if (flags.title) body.title = flags.title
    if (flags.description) body.description = flags.description
    if (flags.status) body.status = flags.status
    if (flags.priority) body.priority = parseInt(flags.priority as string)
    if (flags['due-date'] !== undefined) body.due_date = flags['due-date'] === 'null' ? null : flags['due-date']
    if (flags['project-id'] !== undefined) body.project_id = flags['project-id'] === 'null' ? null : parseInt(flags['project-id'] as string)
    if (flags['parent-id'] !== undefined) body.parent_id = flags['parent-id'] === 'null' ? null : parseInt(flags['parent-id'] as string)
    if (flags['estimated-minutes']) body.estimated_minutes = parseInt(flags['estimated-minutes'] as string)
    if (flags.recurrence) body.recurrence_rule = flags.recurrence
    if (flags['tag-ids']) body.tag_ids = (flags['tag-ids'] as string).split(',').map(Number)
    await api('PUT', `/api/tasks/${id}`, body)
  },

  async delete(args) {
    const { positional, flags } = parse(args)
    const id = positional[0]
    await confirmDelete('DELETE', `/api/tasks/${id}`, { positional, flags }, `task ${id}`)
    await api('DELETE', `/api/tasks/${id}`)
  },

  async reorder(args) {
    const { flags } = parse(args)
    if (!flags.items) {
      process.stderr.write('需要 --items 参数 (JSON 数组)\n')
      process.exit(1)
    }
    const orders = JSON.parse(flags.items as string)
    await api('POST', '/api/tasks/reorder', { orders })
  },

  async link(args) {
    const { positional, flags } = parse(args)
    const taskId = positional[0]
    const docId = positional[1]
    await api('POST', `/api/tasks/${taskId}/documents`, {
      document_id: parseInt(docId),
      relation: (flags.type as string) || 'reference',
    })
  },

  async unlink(args) {
    const { positional, flags } = parse(args)
    const taskId = positional[0]
    const docId = positional[1]
    await confirmDelete('DELETE', `/api/tasks/${taskId}/documents/${docId}`, { positional, flags }, `task-document link`)

    await api('DELETE', `/api/tasks/${taskId}/documents/${docId}`)
  },
}
