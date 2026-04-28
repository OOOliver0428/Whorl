import { parse } from './args.js'

const DEBUG = process.env.WHORL_CLI_DEBUG === '1' || process.env.NODE_ENV === 'development'

// Delete confirmation guard.
// If --confirm is present, proceeds. Otherwise fetches the resource for inspection
// and exits with instructions.
// Only applies to write subcommands that have a DELETE intent.

export async function confirmDelete(
  method: string,
  path: string,
  args: ReturnType<typeof parse>,
  entityLabel: string,
): Promise<void> {
  if (args.flags.confirm) {
    // In debug mode, print protected resource info before proceeding
    if (DEBUG) {
      const originalWrite = process.stdout.write.bind(process.stdout)
      const warn = (msg: string) => process.stderr.write(msg)
      warn(`[guard] DELETE confirmed for ${entityLabel}\n`)
      warn(`[guard] ${method} ${path}\n`)
      originalWrite('')
    }
    return
  }

  // Fetch the resource being deleted for inspection
  try {
    const previewPath = path.replace('/reorder', '') // reorder has no GET preview
    if (previewPath.includes('/documents/')) {
      // task-document unlink: split path
      const match = previewPath.match(/(\/\d+\/documents\/\d+)/)
      if (match) {
        process.stderr.write(`即将删除: ${entityLabel}\n`)
        process.stderr.write(`路径: ${method} ${previewPath}\n`)
        process.stderr.write('\n请先备份数据, 然后加上 --confirm 确认执行。\n')
        process.exit(1)
      }
    }

    const res = await fetch(
      `${process.env.WHORL_URL || 'http://localhost:3001'}${previewPath}`,
    )
    if (res.ok) {
      const data = await res.text()
      process.stderr.write(`即将删除的 ${entityLabel}:\n${data}\n\n`)
    } else {
      process.stderr.write(`[警告] 资源不存在或无法预览: ${previewPath}\n`)
    }
  } catch {
    process.stderr.write(`[警告] 无法获取预览: ${path}\n`)
  }

  process.stderr.write('请加上 --confirm 确认执行此删除操作。\n')
  process.exit(1)
}
