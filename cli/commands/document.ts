import { api } from '../client.js'
import { parse, toQueryString } from '../args.js'
import { confirmDelete } from '../guard.js'

type Handler = (args: string[]) => Promise<void>

export const read: Record<string, Handler> = {
  async list(args) {
    const { flags } = parse(args)
    await api('GET', '/api/documents' + toQueryString(flags))
  },

  async get(args) {
    const { positional } = parse(args)
    await api('GET', `/api/documents/${positional[0]}`)
  },
}

export const write: Record<string, Handler> = {
  async create(args) {
    const { flags } = parse(args)
    const body: Record<string, unknown> = {}
    if (flags.name) body.name = flags.name
    if (flags['project-id']) body.project_id = parseInt(flags['project-id'] as string)
    if (flags.path) body.file_path = flags.path
    if (flags['file-type']) body.file_type = flags['file-type']
    if (flags.size) body.file_size = parseInt(flags.size as string)
    if (flags['last-modified']) body.last_modified = flags['last-modified']
    if (flags.hash) body.file_hash = flags.hash
    await api('POST', '/api/documents', body)
  },

  async update(args) {
    const { positional, flags } = parse(args)
    const id = positional[0]
    const body: Record<string, unknown> = {}
    if (flags.name) body.name = flags.name
    if (flags.description) body.description = flags.description
    if (flags.status) body.status = flags.status
    await api('PUT', `/api/documents/${id}`, body)
  },

  async delete(args) {
    const { positional, flags } = parse(args)
    const id = positional[0]
    await confirmDelete('DELETE', `/api/documents/${id}`, { positional, flags }, `document ${id}`)
    await api('DELETE', `/api/documents/${id}`)
  },

  async scan(args) {
    const { flags } = parse(args)
    const body: Record<string, unknown> = { dir_path: flags.directory }
    if (flags.extensions) {
      body.extensions = (flags.extensions as string).split(',').map(s => s.trim())
    }
    await api('POST', '/api/documents/scan', body)
  },

  async import(args) {
    const { flags } = parse(args)
    if (!flags['project-id']) {
      process.stderr.write('需要 --project-id 参数\n')
      process.exit(1)
    }
    if (!flags.files) {
      process.stderr.write('需要 --files 参数 (JSON 数组)\n')
      process.exit(1)
    }
    const body = {
      project_id: parseInt(flags['project-id'] as string),
      files: JSON.parse(flags.files as string),
    }
    await api('POST', '/api/documents/import', body)
  },

  async check(args) {
    const { flags } = parse(args)
    if (!flags['document-ids']) {
      process.stderr.write('需要 --document-ids 参数 (JSON 数组)\n')
      process.exit(1)
    }
    const body = { document_ids: JSON.parse(flags['document-ids'] as string) }
    await api('POST', '/api/documents/check-changes', body)
  },

  async refresh(args) {
    const { positional } = parse(args)
    await api('POST', `/api/documents/${positional[0]}/refresh`)
  },
}
