import { api } from '../client.js'
import { parse } from '../args.js'
import { writeFileSync } from 'fs'

type Handler = (args: string[]) => Promise<void>

export const read: Record<string, Handler> = {
  async json(args) {
    const { flags } = parse(args)
    if (flags.file) {
      // Export to file: fetch directly to capture raw content
      const res = await fetch(
        `${process.env.WHORL_URL || 'http://localhost:3001'}/api/export/json`,
      )
      if (!res.ok) {
        process.stderr.write(await res.text() + '\n')
        process.exit(1)
      }
      const data = await res.text()
      writeFileSync(flags.file as string, data, 'utf-8')
      process.stdout.write(JSON.stringify({ exported: flags.file }) + '\n')
    } else {
      await api('GET', '/api/export/json')
    }
  },

  async csv(args) {
    const { flags } = parse(args)
    if (flags.file) {
      const res = await fetch(
        `${process.env.WHORL_URL || 'http://localhost:3001'}/api/export/csv`,
      )
      if (!res.ok) {
        process.stderr.write(await res.text() + '\n')
        process.exit(1)
      }
      const buf = Buffer.from(await res.arrayBuffer())
      writeFileSync(flags.file as string, buf)
      process.stdout.write(JSON.stringify({ exported: flags.file }) + '\n')
    } else {
      await api('GET', '/api/export/csv')
    }
  },
}

export const write: Record<string, Handler> = {}
