import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, X, Clock } from 'lucide-react'
import { api, type Reminder } from '../../api'

export default function ReminderStrip() {
  const [reminders, setReminders] = useState<Reminder[]>([])

  const fetchReminders = useCallback(() => {
    api.getReminders().then(setReminders).catch((err) => {
      console.error('[ReminderStrip] Failed to fetch reminders:', err)
    })
  }, [])

  useEffect(() => {
    fetchReminders()
    const interval = setInterval(fetchReminders, 30000)
    return () => clearInterval(interval)
  }, [fetchReminders])

  const handleDismiss = async (id: number) => {
    await api.markReminderNotified(id)
    fetchReminders()
  }

  const isOverdue = (r: Reminder) => {
    const now = new Date()
    const current = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    return r.time < current
  }

  // Only show active (not notified, not overdue) reminders
  const activeReminders = reminders.filter((r) => !r.notified && !isOverdue(r))

  if (activeReminders.length === 0) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        className="shrink-0 border-b border-border bg-surface"
      >
        <div className="flex items-start gap-3 px-6 py-3">
          <Bell size={16} className="mt-0.5 shrink-0 text-danger" />
          <div className="flex flex-1 flex-wrap gap-2">
            {activeReminders.map((r) => (
              <div
                key={r.id}
                className="flex items-center gap-2 rounded-full border border-danger/20 bg-danger/5 px-3 py-1 text-xs text-text"
              >
                <Clock size={12} className="text-danger" />
                <span className="font-mono font-medium text-danger">{r.time}</span>
                <span className="max-w-[200px] truncate">{r.message}</span>
                <button
                  onClick={() => handleDismiss(r.id)}
                  className="ml-1 rounded-full p-0.5 text-text-muted transition-colors hover:text-danger"
                  title="标记为已处理"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
