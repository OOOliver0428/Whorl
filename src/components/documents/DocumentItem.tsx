import { motion } from 'framer-motion'
import { AlertTriangle, RefreshCw, Trash2, RotateCcw } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import type { Document } from '../../api'

interface Props {
  document: Document
  onRefresh: (doc: Document) => void
  onDelete: (doc: Document) => void
  onRestore: (doc: Document) => void
  index?: number
}

function formatSize(bytes: number | null): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getFileIcon(fileType: string | null): string {
  if (!fileType) return '📄'
  const t = fileType.toLowerCase()
  if (t === 'pdf') return '📕'
  if (['doc', 'docx'].includes(t)) return '📘'
  if (['xls', 'xlsx'].includes(t)) return '📗'
  if (['ppt', 'pptx'].includes(t)) return '📙'
  if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(t)) return '🖼️'
  if (['md', 'txt'].includes(t)) return '📝'
  return '📄'
}

export default function DocumentItem({ document: doc, onRefresh, onDelete, onRestore: _onRestore, index = 0 }: Props) {
  const isMissing = doc.status === 'missing'
  const isChanged = doc.status === 'changed'

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className={`group flex items-center gap-3 rounded-xl border px-4 py-3 transition-all ${
        isMissing
          ? 'border-danger/30 bg-danger/5'
          : isChanged
            ? 'border-warning/30 bg-warning/5'
            : 'border-transparent bg-surface hover:border-border hover:shadow-sm'
      }`}
    >
      {/* Icon */}
      <span className="shrink-0 text-lg">{getFileIcon(doc.file_type)}</span>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-text">{doc.name}</span>
          {isMissing && (
            <span className="flex shrink-0 items-center gap-1 rounded-md bg-danger/10 px-1.5 py-0.5 text-[10px] font-medium text-danger">
              <AlertTriangle size={10} /> 文件丢失
            </span>
          )}
          {isChanged && (
            <span className="flex shrink-0 items-center gap-1 rounded-md bg-warning/10 px-1.5 py-0.5 text-[10px] font-medium text-warning">
              <RefreshCw size={10} /> 已变更
            </span>
          )}
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-xs text-text-muted">
          <span className="truncate max-w-[300px]">{doc.file_path}</span>
          {doc.file_size && (
            <>
              <span>·</span>
              <span>{formatSize(doc.file_size)}</span>
            </>
          )}
          {doc.last_modified && (
            <>
              <span>·</span>
              <span>{format(parseISO(doc.last_modified), 'yyyy-MM-dd')}</span>
            </>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        {isChanged && (
          <button
            onClick={() => onRefresh(doc)}
            className="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-surface-hover hover:text-primary"
            title="刷新记录"
          >
            <RotateCcw size={14} />
          </button>
        )}
        <button
          onClick={() => onDelete(doc)}
          className="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-surface-hover hover:text-danger"
          title="删除"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </motion.div>
  )
}
