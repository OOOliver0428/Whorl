import { api } from '../client.js'
import { parse } from '../args.js'
import { confirmDelete } from '../guard.js'

type Handler = (args: string[]) => Promise<void>

export const read: Record<string, Handler> = {
  async list() {
    await api('GET', '/api/projects')
  },

  async get(args) {
    const { positional } = parse(args)
    await api('GET', `/api/projects/${positional[0]}`)
  },
}

export const write: Record<string, Handler> = {
  async create(args) {
    const { flags } = parse(args)
    const body: Record<string, unknown> = {}
    if (flags.name) body.name = flags.name
    if (flags.color) body.color = flags.color
    if (flags.icon) body.icon = flags.icon
    await api('POST', '/api/projects', body)
  },

  async update(args) {
    const { positional, flags } = parse(args)
    const id = positional[0]
    const body: Record<string, unknown> = {}
    if (flags.name) body.name = flags.name
    if (flags.color) body.color = flags.color
    if (flags.icon) body.icon = flags.icon
    if (flags.archived !== undefined) body.archived = true
    await api('PUT', `/api/projects/${id}`, body)
  },

  async delete(args) {
    const { positional, flags } = parse(args)
    const id = positional[0]
    await confirmDelete('DELETE', `/api/projects/${id}`, { positional, flags }, `project ${id}`)
    await api('DELETE', `/api/projects/${id}`)
  },
}
