import { Router } from 'express'
import { z } from 'zod'

const router = Router()

interface Reminder {
  id: number
  time: string
  message: string
  date: string
  notified: boolean
}

let reminders: Reminder[] = []
let nextId = 1

function localDate(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const reminderSchema = z.object({
  time: z.string().regex(/^\d{2}:\d{2}$/, '时间格式为 HH:MM'),
  message: z.string().min(1, '消息不能为空').max(100, '消息最多 100 字'),
})

function validate<T extends z.ZodTypeAny>(schema: T) {
  return (req: any, res: any, next: any) => {
    const result = schema.safeParse(req.body)
    if (!result.success) {
      const msg = result.error.issues.map((i: any) => i.message).join(', ')
      return res.status(400).json({ error: msg })
    }
    req.body = result.data
    next()
  }
}

// GET /api/reminders — get today's reminders, auto-clean expired
router.get('/', (_req, res) => {
  const today = localDate()
  reminders = reminders.filter((r) => r.date === today)
  res.json(reminders)
})

// POST /api/reminders — create reminder
router.post('/', validate(reminderSchema), (req, res) => {
  const { time, message } = req.body
  const today = localDate()

  const [h, m] = time.split(':').map(Number)
  const now = new Date()
  const reminderMinutes = h * 60 + m
  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  if (reminderMinutes <= currentMinutes) {
    return res.status(400).json({ error: '提醒时间必须晚于当前时间' })
  }

  const reminder: Reminder = { id: nextId++, time, message, date: today, notified: false }
  reminders.push(reminder)
  res.status(201).json(reminder)
})

// PATCH /api/reminders/:id — mark as notified
router.patch('/:id', (req, res) => {
  const id = parseInt(req.params.id)
  const reminder = reminders.find((r) => r.id === id)
  if (!reminder) return res.status(404).json({ error: 'Reminder not found' })
  reminder.notified = true
  res.json(reminder)
})

// DELETE /api/reminders/:id — delete reminder
router.delete('/:id', (req, res) => {
  const id = parseInt(req.params.id)
  reminders = reminders.filter((r) => r.id !== id)
  res.json({ success: true })
})

export default router
