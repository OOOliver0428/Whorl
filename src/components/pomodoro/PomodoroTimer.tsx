import { useState, useEffect, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Play, Pause, RotateCcw, Coffee, Zap, History } from 'lucide-react'
import { api } from '../../api'
import { useAppStore } from '../../store'

const WORK_MINUTES = 25
const BREAK_MINUTES = 5

export default function PomodoroTimer() {
  const { tasks } = useAppStore()
  const [mode, setMode] = useState<'work' | 'break'>('work')
  const [secondsLeft, setSecondsLeft] = useState(WORK_MINUTES * 60)
  const [isRunning, setIsRunning] = useState(false)
  const [linkedTaskId, setLinkedTaskId] = useState<number | null>(null)
  const [todayStats, setTodayStats] = useState({ sessions: 0, total_minutes: 0 })
  const [sessions, setSessions] = useState<any[]>([])
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const totalSeconds = mode === 'work' ? WORK_MINUTES * 60 : BREAK_MINUTES * 60
  const progress = ((totalSeconds - secondsLeft) / totalSeconds) * 100
  const minutes = Math.floor(secondsLeft / 60)
  const seconds = secondsLeft % 60

  const loadData = useCallback(() => {
    api.getTodayPomodoro().then(setTodayStats)
    api.getSessions({ limit: '10' }).then(setSessions)
  }, [])

  useEffect(() => { loadData() }, [loadData])

  useEffect(() => {
    if (isRunning && secondsLeft > 0) {
      intervalRef.current = setInterval(() => {
        setSecondsLeft((s) => s - 1)
      }, 1000)
    } else if (secondsLeft === 0) {
      setIsRunning(false)

      // Only log work sessions to DB
      if (mode === 'work') {
        api.createSession({
          task_id: linkedTaskId,
          duration_minutes: WORK_MINUTES,
          type: 'work',
        }).then(() => loadData())
      }

      // Switch mode
      if (mode === 'work') {
        setMode('break')
        setSecondsLeft(BREAK_MINUTES * 60)
      } else {
        setMode('work')
        setSecondsLeft(WORK_MINUTES * 60)
      }
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [isRunning, secondsLeft, mode, linkedTaskId, loadData])

  const reset = () => {
    setIsRunning(false)
    setSecondsLeft(mode === 'work' ? WORK_MINUTES * 60 : BREAK_MINUTES * 60)
  }

  const switchMode = (newMode: 'work' | 'break') => {
    setIsRunning(false)
    setMode(newMode)
    setSecondsLeft(newMode === 'work' ? WORK_MINUTES * 60 : BREAK_MINUTES * 60)
  }

  const circumference = 2 * Math.PI * 120
  const strokeDashoffset = circumference - (progress / 100) * circumference

  const todoTasks = tasks.filter((t) => t.status !== 'done').slice(0, 10)

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Mode switch */}
      <div className="flex justify-center gap-2">
        <button
          onClick={() => switchMode('work')}
          className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium transition-all ${
            mode === 'work' ? 'bg-primary text-white shadow-lg shadow-primary/25' : 'bg-surface text-text-secondary hover:bg-surface-hover'
          }`}
        >
          <Zap size={16} /> 专注
        </button>
        <button
          onClick={() => switchMode('break')}
          className={`flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium transition-all ${
            mode === 'break' ? 'bg-success text-white shadow-lg shadow-success/25' : 'bg-surface text-text-secondary hover:bg-surface-hover'
          }`}
        >
          <Coffee size={16} /> 休息
        </button>
      </div>

      {/* Timer circle */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="relative mx-auto flex h-72 w-72 items-center justify-center"
      >
        <svg className="absolute h-full w-full -rotate-90" viewBox="0 0 260 260">
          <circle cx="130" cy="130" r="120" fill="none" stroke="var(--color-border)" strokeWidth="6" />
          <circle
            cx="130" cy="130" r="120" fill="none"
            stroke={mode === 'work' ? 'var(--color-primary)' : 'var(--color-success)'}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-1000 ease-linear"
          />
        </svg>
        <div className="text-center">
          <div className="font-display text-6xl font-bold tracking-tight tabular-nums">
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </div>
          <div className="mt-2 text-sm text-text-muted">
            {mode === 'work' ? '专注时间' : '休息时间'}
          </div>
        </div>
      </motion.div>

      {/* Controls */}
      <div className="flex justify-center gap-3">
        <button
          onClick={() => setIsRunning(!isRunning)}
          className={`flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-lg transition-all hover:scale-105 active:scale-95 ${
            mode === 'work' ? 'bg-primary shadow-primary/30' : 'bg-success shadow-success/30'
          }`}
        >
          {isRunning ? <Pause size={24} /> : <Play size={24} className="ml-1" />}
        </button>
        <button
          onClick={reset}
          className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-surface text-text-secondary transition-all hover:bg-surface-hover hover:scale-105 active:scale-95"
        >
          <RotateCcw size={20} />
        </button>
      </div>

      {/* Link task */}
      <div className="rounded-2xl border border-border bg-surface p-5">
        <label className="mb-2 block text-sm font-medium text-text-secondary">关联任务</label>
        <select
          value={linkedTaskId || ''}
          onChange={(e) => setLinkedTaskId(e.target.value ? parseInt(e.target.value) : null)}
          className="w-full rounded-lg border border-border bg-bg px-3 py-2.5 text-sm text-text outline-none transition-colors focus:border-primary"
        >
          <option value="">不关联</option>
          {todoTasks.map((t) => (
            <option key={t.id} value={t.id}>{t.title}</option>
          ))}
        </select>
      </div>

      {/* Today stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-2xl border border-border bg-surface p-5 text-center">
          <div className="font-display text-3xl font-bold text-primary">{todayStats.sessions}</div>
          <div className="mt-1 text-sm text-text-muted">今日番茄</div>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-5 text-center">
          <div className="font-display text-3xl font-bold text-primary">{todayStats.total_minutes}</div>
          <div className="mt-1 text-sm text-text-muted">专注分钟</div>
        </div>
      </div>

      {/* Recent sessions */}
      {sessions.length > 0 && (
        <div className="rounded-2xl border border-border bg-surface p-5">
          <h3 className="mb-3 flex items-center gap-2 font-display text-sm font-semibold text-text-secondary">
            <History size={16} /> 最近记录
          </h3>
          <div className="space-y-2">
            {sessions.slice(0, 5).map((s) => (
              <div key={s.id} className="flex items-center justify-between text-sm">
                <span className="text-text">
                  {s.type === 'work' ? '🍅' : '☕'} {s.task_title || '未关联任务'}
                </span>
                <span className="text-text-muted">{s.duration_minutes}min</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
