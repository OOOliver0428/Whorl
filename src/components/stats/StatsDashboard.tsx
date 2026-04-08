import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { api } from '../../api'
import { CheckCircle2, ListTodo, CalendarCheck, Timer, TrendingUp } from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend,
} from 'recharts'

interface Overview {
  today_done: number
  total_todo: number
  overdue: number
  pomodoro_today: number
  total_days: number
}

interface TrendItem { date: string; count: number }
interface ProjectStat { id: number; name: string; color: string; icon: string; total: number; done: number }
interface PriorityStat { priority: number; total: number; done: number }
interface HeatmapItem { date: string; count: number }

const priorityLabels = ['低', '中', '高', '紧急']

export default function StatsDashboard() {
  const [overview, setOverview] = useState<Overview | null>(null)
  const [trend, setTrend] = useState<TrendItem[]>([])
  const [projectStats, setProjectStats] = useState<ProjectStat[]>([])
  const [priorityStats, setPriorityStats] = useState<PriorityStat[]>([])
  const [heatmap, setHeatmap] = useState<HeatmapItem[]>([])
  const [trendRange, setTrendRange] = useState(30)

  useEffect(() => {
    api.getOverview().then(setOverview)
    api.getProjectStats().then(setProjectStats)
    api.getPriorityStats().then(setPriorityStats)
    api.getHeatmap(new Date().getFullYear()).then(setHeatmap)
  }, [])

  useEffect(() => {
    api.getTrend(trendRange).then(setTrend)
  }, [trendRange])

  // Build heatmap grid
  const year = new Date().getFullYear()
  const heatmapMap = new Map(heatmap.map((h) => [h.date, h.count]))
  const weeks: { date: string; count: number; dayOfWeek: number }[][] = []
  const startDate = new Date(year, 0, 1)
  // Align to Monday
  const dayOfWeek = startDate.getDay()
  startDate.setDate(startDate.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))

  let currentWeek: { date: string; count: number; dayOfWeek: number }[] = []
  const d = new Date(startDate)
  const endDate = new Date(year, 11, 31)
  while (d <= endDate) {
    const dateStr = d.toISOString().split('T')[0]
    const dow = d.getDay()
    currentWeek.push({
      date: dateStr,
      count: heatmapMap.get(dateStr) || 0,
      dayOfWeek: dow,
    })
    if (dow === 0 || d >= endDate) {
      weeks.push(currentWeek)
      currentWeek = []
    }
    d.setDate(d.getDate() + 1)
  }
  if (currentWeek.length > 0) weeks.push(currentWeek)

  const getHeatColor = (count: number) => {
    if (count === 0) return 'bg-border-subtle'
    if (count <= 2) return 'bg-primary/20'
    if (count <= 5) return 'bg-primary/40'
    if (count <= 10) return 'bg-primary/60'
    return 'bg-primary'
  }

  if (!overview) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Overview cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: '今日完成', value: overview.today_done, icon: CheckCircle2, color: 'text-success', bg: 'bg-success/10' },
          { label: '待办任务', value: overview.total_todo, icon: ListTodo, color: 'text-primary', bg: 'bg-primary/10' },
          { label: '累计天数', value: `${overview.total_days}天`, icon: CalendarCheck, color: 'text-warning', bg: 'bg-warning/10' },
          { label: '今日番茄', value: overview.pomodoro_today, icon: Timer, color: 'text-accent', bg: 'bg-accent/10' },
        ].map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="rounded-2xl border border-border bg-surface p-5 transition-shadow hover:shadow-sm"
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-medium text-text-secondary">{card.label}</span>
              <div className={`rounded-xl p-2 ${card.bg}`}>
                <card.icon size={18} className={card.color} />
              </div>
            </div>
            <div className="font-display text-3xl font-bold tracking-tight">{card.value}</div>
            {overview.overdue > 0 && card.label === '待办任务' && (
              <div className="mt-1 text-xs text-danger">含 {overview.overdue} 项逾期</div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Trend chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="rounded-2xl border border-border bg-surface p-5"
        >
          <div className="mb-4 flex items-center justify-between">
            <h3 className="flex items-center gap-2 font-display text-base font-semibold">
              <TrendingUp size={18} className="text-primary" />
              完成趋势
            </h3>
            <div className="flex gap-1">
              {[7, 30, 90].map((r) => (
                <button
                  key={r}
                  onClick={() => setTrendRange(r)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                    trendRange === r ? 'bg-primary text-white' : 'text-text-muted hover:bg-surface-hover'
                  }`}
                >
                  {r}天
                </button>
              ))}
            </div>
          </div>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }}
                  tickFormatter={(v) => v.slice(5)}
                />
                <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '10px',
                    fontSize: '12px',
                    color: 'var(--color-text)',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="var(--color-primary)"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 4, fill: 'var(--color-primary)' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Project distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="rounded-2xl border border-border bg-surface p-5"
        >
          <h3 className="mb-4 flex items-center gap-2 font-display text-base font-semibold">
            项目分布
          </h3>
          {projectStats.length > 0 ? (
            <div className="flex items-center gap-6">
              <div className="h-52 w-52">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={projectStats}
                      dataKey="total"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                      cornerRadius={6}
                    >
                      {projectStats.map((p) => (
                        <Cell key={p.id} fill={p.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--color-surface)',
                        border: '1px solid var(--color-border)',
                        borderRadius: '10px',
                        fontSize: '12px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-2">
                {projectStats.map((p) => (
                  <div key={p.id} className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                    <span className="flex-1 text-sm text-text">{p.icon} {p.name}</span>
                    <span className="text-xs text-text-muted">
                      {p.done}/{p.total}
                    </span>
                    <div className="h-1.5 w-16 overflow-hidden rounded-full bg-border">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${p.total > 0 ? (p.done / p.total) * 100 : 0}%`, backgroundColor: p.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex h-40 items-center justify-center text-sm text-text-muted">暂无项目数据</div>
          )}
        </motion.div>
      </div>

      {/* Bottom row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Heatmap */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="rounded-2xl border border-border bg-surface p-5"
        >
          <h3 className="mb-4 font-display text-base font-semibold">{year} 年活动热力图</h3>
          <div className="overflow-x-auto">
            <div className="inline-flex gap-[3px]">
              {weeks.map((week, wi) => (
                <div key={wi} className="flex flex-col gap-[3px]">
                  {week.map((day) => (
                    <div
                      key={day.date}
                      title={`${day.date}: ${day.count}个任务完成`}
                      className={`h-[11px] w-[11px] rounded-[2px] transition-colors ${getHeatColor(day.count)}`}
                    />
                  ))}
                </div>
              ))}
            </div>
            <div className="mt-2 flex items-center gap-1 text-[10px] text-text-muted">
              <span>少</span>
              {['bg-border-subtle', 'bg-primary/20', 'bg-primary/40', 'bg-primary/60', 'bg-primary'].map((c) => (
                <span key={c} className={`h-[11px] w-[11px] rounded-[2px] ${c}`} />
              ))}
              <span>多</span>
            </div>
          </div>
        </motion.div>

        {/* Priority bar chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="rounded-2xl border border-border bg-surface p-5"
        >
          <h3 className="mb-4 font-display text-base font-semibold">优先级分布</h3>
          {priorityStats.length > 0 ? (
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={priorityStats.map((p) => ({
                  ...p,
                  name: priorityLabels[p.priority] || `P${p.priority}`,
                  pending: p.total - p.done,
                }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--color-surface)',
                      border: '1px solid var(--color-border)',
                      borderRadius: '10px',
                      fontSize: '12px',
                    }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: '12px' }}
                    formatter={(value) => <span style={{ color: 'var(--color-text-secondary)' }}>{value === 'done' ? '已完成' : '未完成'}</span>}
                  />
                  <Bar dataKey="done" stackId="a" fill="var(--color-primary)" radius={[0, 0, 0, 0]} name="done" />
                  <Bar dataKey="pending" stackId="a" fill="var(--color-border)" radius={[4, 4, 0, 0]} name="pending" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-40 items-center justify-center text-sm text-text-muted">暂无数据</div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
