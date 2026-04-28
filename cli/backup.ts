import { cpSync, existsSync, mkdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

function timestamp(): string {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
    '_',
    pad(now.getHours()),
    pad(now.getMinutes()),
    pad(now.getSeconds()),
  ].join('')
}

export function runBackup(_args: string[]): void {
  const DB_DIR = resolve(__dirname, '..', 'data')
  const BACKUP_DIR = resolve(process.env.HOME!, 'whorl_bak')
  const ts = timestamp()
  const dest = `${BACKUP_DIR}/${ts}`

  if (!existsSync(`${DB_DIR}/whorl.db`)) {
    process.stderr.write(`错误: 数据库文件不存在: ${DB_DIR}/whorl.db\n`)
    process.exit(1)
  }

  mkdirSync(dest, { recursive: true })

  cpSync(`${DB_DIR}/whorl.db`, `${dest}/whorl.db`)
  if (existsSync(`${DB_DIR}/whorl.db-wal`)) {
    cpSync(`${DB_DIR}/whorl.db-wal`, `${dest}/whorl.db-wal`)
  }
  if (existsSync(`${DB_DIR}/whorl.db-shm`)) {
    cpSync(`${DB_DIR}/whorl.db-shm`, `${dest}/whorl.db-shm`)
  }

  const result = { action: 'backup', dest: dest, timestamp: ts }
  process.stdout.write(JSON.stringify(result) + '\n')
}
