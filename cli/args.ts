export interface ParsedArgs {
  positional: string[]
  flags: Record<string, string | true>
}

export function parse(argv: string[]): ParsedArgs {
  const positional: string[] = []
  const flags: Record<string, string | true> = {}

  let i = 0
  while (i < argv.length) {
    if (argv[i].startsWith('--')) {
      const raw = argv[i].slice(2)
      if (i + 1 < argv.length && !argv[i + 1].startsWith('--')) {
        flags[raw] = argv[i + 1]
        i += 2
      } else {
        flags[raw] = true
        i += 1
      }
    } else {
      positional.push(argv[i])
      i += 1
    }
  }

  return { positional, flags }
}

export function toQueryString(flags: Record<string, string | true>): string {
  const parts: string[] = []
  for (const [k, v] of Object.entries(flags)) {
    const key = k.replace(/-/g, '_') // CLI uses hyphens, API uses underscores
    if (v === true) parts.push(encodeURIComponent(key))
    else parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(v)}`)
  }
  return parts.length > 0 ? '?' + parts.join('&') : ''
}
