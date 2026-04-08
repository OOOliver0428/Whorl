import Database from 'better-sqlite3'
import { mkdirSync } from 'fs'
import { join, dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = join(__dirname, '..', 'data')
const DB_PATH = process.env.DB_PATH ? resolve(process.env.DB_PATH) : join(DATA_DIR, 'whorl.db')

mkdirSync(DATA_DIR, { recursive: true })

const db = new Database(DB_PATH)

db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

// Migration system
const CURRENT_VERSION = 2

db.exec(`
  CREATE TABLE IF NOT EXISTS _meta (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )
`)

function getDbVersion(): number {
  const row = db.prepare("SELECT value FROM _meta WHERE key = 'version'").get() as { value: string } | undefined
  return row ? parseInt(row.value) : 0
}

function setDbVersion(v: number) {
  db.prepare("INSERT OR REPLACE INTO _meta (key, value) VALUES ('version', ?)").run(String(v))
}

function runMigrations() {
  const current = getDbVersion()

  if (current < 1) {
    db.exec(`
      -- Projects
      CREATE TABLE projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        color TEXT NOT NULL DEFAULT '#6366f1',
        icon TEXT DEFAULT '📁',
        archived INTEGER NOT NULL DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );

      -- Tags
      CREATE TABLE tags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        color TEXT NOT NULL DEFAULT '#94a3b8',
        created_at TEXT DEFAULT (datetime('now'))
      );

      -- Tasks
      CREATE TABLE tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT DEFAULT '',
        status TEXT NOT NULL DEFAULT 'todo' CHECK(status IN ('todo','done')),
        priority INTEGER NOT NULL DEFAULT 1 CHECK(priority BETWEEN 0 AND 3),
        due_date TEXT,
        project_id INTEGER,
        parent_id INTEGER,
        recurrence_rule TEXT,
        estimated_minutes INTEGER DEFAULT 0,
        sort_order INTEGER NOT NULL DEFAULT 0,
        completed_at TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
        FOREIGN KEY (parent_id) REFERENCES tasks(id) ON DELETE CASCADE
      );

      -- Task-Tag junction
      CREATE TABLE task_tags (
        task_id INTEGER NOT NULL,
        tag_id INTEGER NOT NULL,
        PRIMARY KEY (task_id, tag_id),
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
        FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
      );

      -- Pomodoro sessions
      CREATE TABLE pomodoro_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id INTEGER,
        started_at TEXT NOT NULL DEFAULT (datetime('now')),
        duration_minutes INTEGER NOT NULL DEFAULT 25,
        type TEXT NOT NULL DEFAULT 'work' CHECK(type IN ('work','break')),
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL
      );

      -- Indexes
      CREATE INDEX idx_tasks_status ON tasks(status);
      CREATE INDEX idx_tasks_project ON tasks(project_id);
      CREATE INDEX idx_tasks_parent ON tasks(parent_id);
      CREATE INDEX idx_tasks_due_date ON tasks(due_date);
      CREATE INDEX idx_pomodoro_task ON pomodoro_sessions(task_id);

      -- Default project
      INSERT INTO projects (name, color, icon) VALUES ('收件箱', '#6366f1', '📥');
    `)
    setDbVersion(1)
  }

  // v2: Remove 'doing' status, simplify to todo/done
  if (current < 2) {
    db.exec(`
      -- Convert any 'doing' tasks to 'todo'
      UPDATE tasks SET status = 'todo' WHERE status = 'doing';
    `)
    // Note: SQLite doesn't support ALTER TABLE to modify CHECK constraints.
    // The old constraint still allows 'doing' in existing DBs, but the app
    // logic only uses 'todo' and 'done' going forward.
    setDbVersion(2)
  }

  // v1.1.0 placeholder: document pool tables
  // Will be added in migration v2
}

runMigrations()

export default db
