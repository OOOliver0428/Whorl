import express from 'express'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { existsSync } from 'fs'
import { config } from 'dotenv'
import tasksRouter from './routes/tasks.js'
import projectsRouter from './routes/projects.js'
import tagsRouter from './routes/tags.js'
import pomodoroRouter from './routes/pomodoro.js'
import statsRouter from './routes/stats.js'
import exportRouter from './routes/export.js'
import documentsRouter from './routes/documents.js'
import remindersRouter from './routes/reminders.js'

config()

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = parseInt(process.env.PORT || '3001')

app.use(express.json())

// API Routes (registered first, before any static serving)
app.use('/api/tasks', tasksRouter)
app.use('/api/projects', projectsRouter)
app.use('/api/tags', tagsRouter)
app.use('/api/pomodoro', pomodoroRouter)
app.use('/api/stats', statsRouter)
app.use('/api/export', exportRouter)
app.use('/api/documents', documentsRouter)
app.use('/api/reminders', remindersRouter)

// Serve static frontend in production
const distPath = join(__dirname, '..', 'dist')
if (existsSync(distPath)) {
  // Serve static assets with explicit path filtering
  app.use((req, res, next) => {
    // Never serve static for /api paths
    if (req.path.startsWith('/api/')) return next()
    express.static(distPath)(req, res, next)
  })

  // SPA fallback for non-API, non-static routes
  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api/')) return next()
    res.sendFile(join(distPath, 'index.html'))
  })
} else {
  console.warn(`\n  ⚠ dist/ not found at ${distPath} — frontend will not be served.`)
  console.warn(`  Run 'npm run build' first.\n`)
  // Return helpful error for non-API requests
  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api/')) return next()
    res.status(503).send('Frontend not built. Run: npm run build')
  })
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n  🌀 Whorl server running at http://localhost:${PORT}\n`)
})
