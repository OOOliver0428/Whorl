import { api } from '../client.js'
import { parse, toQueryString } from '../args.js'

type Handler = (args: string[]) => Promise<void>

export const read: Record<string, Handler> = {
  async list(args) {
    const { flags } = parse(args)
    await api('GET', '/api/pomodoro' + toQueryString(flags))
  },

  async today() {
    await api('GET', '/api/pomodoro/today')
  },
}

export const write: Record<string, Handler> = {
  async start(args) {
    const { flags } = parse(args)
    const body: Record<string, unknown> = {}
    if (flags['task-id']) body.task_id = parseInt(flags['task-id'] as string)
    if (flags.duration) body.duration_minutes = parseInt(flags.duration as string)
    if (flags.type) body.type = flags.type
    await api('POST', '/api/pomodoro', body)
  },
}
