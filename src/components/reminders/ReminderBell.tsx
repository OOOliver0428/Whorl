import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'framer-motion'
import { Bell, Plus, Trash2, X } from 'lucide-react'
import { api, type Reminder } from '../../api'

export default function ReminderBell() {
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [open, setOpen] = useState(false)
  const [time, setTime] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const btnRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const fetchReminders = useCallback(() => {
    api.getReminders().then(setReminders).catch(() => {})
  }, [])

  useEffect(() => {
    fetchReminders()
    const interval = setInterval(fetchReminders, 30000)
    return () => clearInterval(interval)
  }, [fetchReminders])

  // Check for triggering reminders every 30 seconds
  useEffect(() => {
    const check = () => {
      const now = new Date()
      const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
      for (const r of reminders) {
        if (r.time === currentTime && !r.notified) {
          // Page notification
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(`🔔 ${r.time}`, { body: r.message })
          }
          // Mark as notified
          api.markReminderNotified(r.id).then(fetchReminders).catch(() => {})
        }
      }
    }
    const interval = setInterval(check, 30000)
    return () => clearInterval(interval)
  }, [reminders, fetchReminders])

  // Adjust position after render if panel overflows viewport
  useEffect(() => {
    if (!open || !panelRef.current) return
    const panel = panelRef.current
    const rect = panel.getBoundingClientRect()
    let { top, left } = pos

    // If panel overflows right edge, move left
    if (rect.right > window.innerWidth - 8) {
      left = window.innerWidth - rect.width - 8
    }
    // If panel overflows bottom, move up
    if (rect.bottom > window.innerHeight - 8) {
      top = window.innerHeight - rect.height - 8
    }
    // Ensure top is not negative
    top = Math.max(8, top)

    if (top !== pos.top || left !== pos.left) {
      setPos({ top, left })
    }
  }, [open, pos])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node) &&
          btnRef.current && !btnRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handleOpen = () => {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect()
      setPos({ top: rect.top, left: rect.right + 8 })
    }
    setOpen(!open)
    setError('')
  }

  const handleAdd = async () => {
    if (!time || !message.trim()) { setError('请填写时间和消息'); return }
    try {
      await api.createReminder({ time, message: message.trim() })
      setTime('')
      setMessage('')
      setError('')
      fetchReminders()
      // Request notification permission
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission()
      }
    } catch (err: any) {
      setError(err.message || '创建失败')
    }
  }

  const handleDelete = async (id: number) => {
    await api.deleteReminder(id)
    fetchReminders()
  }

  const isOverdue = (r: Reminder) => {
    const now = new Date()
    const current = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    return r.time < current
  }

  const activeCount = reminders.filter((r) => !r.notified && !isOverdue(r)).length

  return (
    <>
      <button
        ref={btnRef}
        onClick={handleOpen}
        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-surface-hover hover:text-text"
      >
        <Bell size={16} />
        <span className="flex-1 text-left">紧急提醒</span>
        {activeCount > 0 && (
          <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-danger text-[10px] font-bold text-white">
            {activeCount}
          </span>
        )}
      </button>

      {open && createPortal(
        <motion.div
          ref={panelRef}
          initial={{ opacity: 0, y: -8, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.96 }}
          transition={{ duration: 0.15 }}
          className="fixed z-50 w-72 rounded-xl border border-border bg-surface shadow-xl"
          style={{ top: pos.top, left: pos.left }}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <span className="text-sm font-semibold text-text">紧急提醒</span>
            <button onClick={() => setOpen(false)} className="rounded p-0.5 text-text-muted hover:text-text">
              <X size={14} />
            </button>
          </div>

          {/* List */}
          <div className="max-h-48 overflow-y-auto">
            {reminders.length === 0 ? (
              <div className="px-4 py-6 text-center text-xs text-text-muted">暂无提醒</div>
            ) : (
              reminders.map((r) => (
                <div
                  key={r.id}
                  className={`group flex items-center gap-3 border-b border-border-subtle px-4 py-2.5 last:border-b-0 ${
                    isOverdue(r) ? 'opacity-50' : ''
                  } ${r.time === `${String(new Date().getHours()).padStart(2, '0')}:${String(new Date().getMinutes()).padStart(2, '0')}` && !r.notified ? 'bg-danger/10' : ''}`}
                >
                  <span className={`text-sm font-mono font-medium ${isOverdue(r) ? 'text-text-muted line-through' : 'text-primary'}`}>
                    {r.time}
                  </span>
                  <span className="flex-1 truncate text-sm text-text">{r.message}</span>
                  <button
                    onClick={() => handleDelete(r.id)}
                    className="rounded p-0.5 text-text-muted opacity-0 transition-all hover:text-danger group-hover:opacity-100"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Add form */}
          <div className="border-t border-border p-3">
            <div className="flex gap-2">
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-24 rounded-lg border border-border bg-bg px-2 py-1.5 text-xs text-text outline-none focus:border-primary"
              />
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                placeholder="提醒内容"
                maxLength={100}
                className="flex-1 rounded-lg border border-border bg-bg px-2 py-1.5 text-xs text-text outline-none placeholder:text-text-muted focus:border-primary"
              />
              <button
                onClick={handleAdd}
                className="flex items-center justify-center rounded-lg bg-primary px-2 py-1.5 text-white transition-colors hover:bg-primary-hover"
              >
                <Plus size={14} />
              </button>
            </div>
            {error && <p className="mt-1.5 text-[11px] text-danger">{error}</p>}
          </div>
        </motion.div>,
        document.body
      )}
    </>
  )
}
