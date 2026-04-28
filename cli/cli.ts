#!/usr/bin/env node

import { runBackup } from './backup.js'

type Handler = (args: string[]) => Promise<void>

const VERB = 2   // argv[2]: read | write | backup
const DOMAIN = 3 // argv[3]: task | project | tag | pomodoro | stats | export | document
const ACTION = 4 // argv[4]: list | get | create | update | delete | ...

function usage(): void {
  // Usage is deliberately minimal — agents should read the skill document.
  process.stderr.write(`用法: cli.sh read|write|backup [domain] [action] [...args]

  cli.sh read task list [--status todo] [--project-id 1] ...
  cli.sh write task create --title "标题" [--priority 2] ...
  cli.sh write task delete <id> --confirm
  cli.sh backup

详见 .opencode/skills/whorl-cli/SKILL.md
`)
  process.exit(1)
}

async function main(): Promise<void> {
  const verb = process.argv[VERB]
  const domain = process.argv[DOMAIN]
  const action = process.argv[ACTION]

  // --- backup ---
  if (verb === 'backup') {
    runBackup([])
    return
  }

  if (!verb || !domain || !action) usage()

  // --- read / write ---
  if (verb !== 'read' && verb !== 'write') {
    process.stderr.write(`未知命令前缀: ${verb}. 请使用 read | write | backup\n`)
    process.exit(1)
  }

  let mod: { read?: Record<string, Handler>; write?: Record<string, Handler> }
  try {
    mod = await import(`./commands/${domain}.js`)
  } catch {
    process.stderr.write(`未知域: ${domain}. 可选: task | project | tag | pomodoro | stats | export | document\n`)
    process.exit(1)
  }

  const handlers = (verb === 'read' ? mod.read : mod.write) || {}
  const fn = handlers[action]
  if (!fn) {
    const allowed = Object.keys(handlers).join(',') || '(无)'
    process.stderr.write(`未知操作: ${verb} ${domain} ${action}. 可选: ${allowed}\n`)
    process.exit(1)
  }

  // Slice argv[5+] as handler args
  await fn(process.argv.slice(5))
}

main()
