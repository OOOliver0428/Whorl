import { api } from '../client.js'
import { parse } from '../args.js'

type Handler = (args: string[]) => Promise<void>

export const read: Record<string, Handler> = {
  async overview() {
    await api('GET', '/api/stats/overview')
  },

  async trend(args) {
    const { flags } = parse(args)
    const range = flags.range || '30'
    await api('GET', `/api/stats/trend?range=${range}`)
  },

  async projects() {
    await api('GET', '/api/stats/projects')
  },

  async priority() {
    await api('GET', '/api/stats/priority')
  },

  async heatmap(args) {
    const { flags } = parse(args)
    const year = flags.year || String(new Date().getFullYear())
    await api('GET', `/api/stats/heatmap?year=${year}`)
  },

  async weekly(args) {
    const { flags } = parse(args)
    const params = new URLSearchParams()
    if (flags['project-id']) params.set('project_id', flags['project-id'] as string)
    if (flags.weeks) params.set('weeks', flags.weeks as string)
    await api('GET', `/api/stats/weekly?${params.toString()}`)
  },

  async tags(args) {
    const { flags } = parse(args)
    const range = flags.range || 'month'
    await api('GET', `/api/stats/tags?range=${range}`)
  },
}

export const write: Record<string, Handler> = {}
