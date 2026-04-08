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

// v1.1.0 placeholder routes
app.use('/api/documents', (_req, res) => {
  res.status(501).json({ error: '文档池功能将在 v1.1.0 中可用' })
})

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
}

app.listen(PORT, '127.0.0.1', () => {
  console.log(`\n  🌀 Whorl server running at http://localhost:${PORT}\n`)
})
