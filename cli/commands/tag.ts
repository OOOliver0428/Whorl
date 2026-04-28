import { api } from '../client.js'
import { parse } from '../args.js'
import { confirmDelete } from '../guard.js'

type Handler = (args: string[]) => Promise<void>

export const read: Record<string, Handler> = {
  async list() {
    await api('GET', '/api/tags')
  },
}

export const write: Record<string, Handler> = {
  async create(args) {
    const { flags } = parse(args)
    const body: Record<string, unknown> = {}
    if (flags.name) body.name = flags.name
    if (flags.color) body.color = flags.color
    await api('POST', '/api/tags', body)
  },

  async update(args) {
    const { positional, flags } = parse(args)
    const id = positional[0]
    const body: Record<string, unknown> = {}
    if (flags.name) body.name = flags.name
    if (flags.color) body.color = flags.color
    await api('PUT', `/api/tags/${id}`, body)
  },

  async delete(args) {
    const { positional, flags } = parse(args)
    const id = positional[0]
    await confirmDelete('DELETE', `/api/tags/${id}`, { positional, flags }, `tag ${id}`)
    await api('DELETE', `/api/tags/${id}`)
  },
}
