import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { api, type TagStat } from '../../api'

const RANGES = [
  { value: 'week', label: '周' },
  { value: 'month', label: '月' },
  { value: 'quarter', label: '季度' },
  { value: 'year', label: '年' },
]

const FONT_SIZES = [14, 18, 22, 28]

function getTier(count: number, maxCount: number): number {
  if (maxCount === 0) return 0
  const ratio = count / maxCount
  if (ratio > 0.7) return 3
  if (ratio > 0.4) return 2
  if (ratio > 0.15) return 1
  return 0
}

export default function TagCloud() {
  const [range, setRange] = useState('month')
  const [tags, setTags] = useState<TagStat[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    api.getTagStats(range)
      .then(setTags)
      .finally(() => setLoading(false))
  }, [range])

  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-display text-base font-semibold">标签词云</h3>
        <div className="flex gap-1">
          {RANGES.map((r) => (
            <button
              key={r.value}
              onClick={() => setRange(r.value)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                range === r.value ? 'bg-primary text-white' : 'text-text-muted hover:bg-surface-hover'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : tags.length === 0 ? (
        <div className="flex h-40 items-center justify-center text-sm text-text-muted">
          暂无标签数据
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 py-4">
          {tags.map((tag, i) => {
            const maxCount = tags[0]?.count || 1
            const tier = getTier(tag.count, maxCount)
            return (
              <motion.span
                key={tag.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.03 }}
                title={`${tag.name} · ${tag.count} 次`}
                className="cursor-default font-display font-semibold transition-transform hover:scale-110"
                style={{
                  fontSize: `${FONT_SIZES[tier]}px`,
                  color: tag.color,
                }}
              >
                #{tag.name}
              </motion.span>
            )
          })}
        </div>
      )}
    </div>
  )
}
