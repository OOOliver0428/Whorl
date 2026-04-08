import { unlinkSync, existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = join(__dirname, 'data')
const DB_PATH = join(DATA_DIR, 'whorl.db')
const WAL_PATH = join(DATA_DIR, 'whorl.db-wal')
const SHM_PATH = join(DATA_DIR, 'whorl.db-shm')

console.log('\n🔄 正在清空 Whorl 数据库...\n')

let removed = 0
for (const f of [DB_PATH, WAL_PATH, SHM_PATH]) {
  if (existsSync(f)) {
    unlinkSync(f)
    console.log(`  ✗ 已删除: ${f.replace(__dirname + '/', '')}`)
    removed++
  }
}

if (removed === 0) {
  console.log('  ℹ 数据库不存在，无需清理')
}

mkdirSync(DATA_DIR, { recursive: true })
console.log('\n✅ 完成。下次启动服务将自动创建全新的空数据库。\n')
