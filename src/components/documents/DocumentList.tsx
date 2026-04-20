import { useState } from 'react'
import { Search, Plus, SlidersHorizontal } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import DocumentItem from './DocumentItem'
import ScanDialog from './ScanDialog'
import type { Document } from '../../api'

interface Props {
  projectId: number
  documents: Document[]
  loading: boolean
  onRefresh: (doc: Document) => void
  onDelete: (doc: Document) => void
  onRestore: (doc: Document) => void
  onImported: () => void
  searchQuery: string
  onSearchChange: (q: string) => void
  statusFilter: string
  onStatusFilterChange: (s: string) => void
  sortField: string
  onSortChange: (s: string) => void
}

export default function DocumentList({
  projectId,
  documents,
  loading,
  onRefresh,
  onDelete,
  onRestore,
  onImported,
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  sortField,
  onSortChange,
}: Props) {
  const [showScan, setShowScan] = useState(false)
  const [showFilters, setShowFilters] = useState(false)

  const missingCount = documents.filter((d) => d.status === 'missing').length
  const changedCount = documents.filter((d) => d.status === 'changed').length

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="搜索文档名称、路径..."
            className="w-full rounded-xl border border-border bg-bg py-2.5 pl-9 pr-4 text-sm text-text outline-none transition-colors placeholder:text-text-muted focus:border-primary"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm transition-colors ${
            showFilters || statusFilter !== 'all' || sortField !== 'created'
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-border text-text-secondary hover:bg-surface-hover'
          }`}
        >
          <SlidersHorizontal size={16} />
          筛选
          {(missingCount > 0 || changedCount > 0) && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-warning text-[10px] font-bold text-white">
              {missingCount + changedCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setShowScan(true)}
          className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-white transition-all hover:bg-primary-hover"
        >
          <Plus size={16} />
          导入文档
        </button>
      </div>

      {/* Filters bar */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-4 rounded-xl border border-border bg-surface px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-text-muted">状态:</span>
                {['all', 'active', 'changed', 'missing'].map((s) => (
                  <button
                    key={s}
                    onClick={() => onStatusFilterChange(s)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                      statusFilter === s ? 'bg-primary text-white' : 'text-text-muted hover:bg-surface-hover'
                    }`}
                  >
                    {s === 'all' ? '全部' : s === 'active' ? '正常' : s === 'changed' ? '已变更' : '丢失'}
                  </button>
                ))}
              </div>
              <div className="h-4 w-px bg-border" />
              <div className="flex items-center gap-2">
                <span className="text-xs text-text-muted">排序:</span>
                {[
                  { value: 'created', label: '导入时间' },
                  { value: 'name', label: '文件名' },
                  { value: 'size', label: '大小' },
                  { value: 'modified', label: '修改时间' },
                ].map((s) => (
                  <button
                    key={s.value}
                    onClick={() => onSortChange(s.value)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                      sortField === s.value ? 'bg-primary text-white' : 'text-text-muted hover:bg-surface-hover'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Change summary */}
      {(missingCount > 0 || changedCount > 0) && !showFilters && (
        <div className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-2.5 text-xs text-text-secondary">
          {changedCount > 0 && <span className="text-warning">🔄 {changedCount} 个文档已变更</span>}
          {missingCount > 0 && <span className="text-danger">⚠️ {missingCount} 个文件丢失</span>}
        </div>
      )}

      {/* Document list */}
      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : documents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-text-muted">
          <div className="mb-4 rounded-2xl bg-surface p-6">
            <Search size={40} strokeWidth={1.5} />
          </div>
          <p className="font-display text-lg font-medium">
            {searchQuery || statusFilter !== 'all' ? '没有匹配的文档' : '文档池为空'}
          </p>
          <p className="mt-1 text-sm">
            {searchQuery || statusFilter !== 'all' ? '尝试调整筛选条件' : '点击「导入文档」将本地文件加入文档池'}
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {documents.map((doc, i) => (
            <DocumentItem
              key={doc.id}
              document={doc}
              onRefresh={onRefresh}
              onDelete={onDelete}
              onRestore={onRestore}
              index={i}
            />
          ))}
        </div>
      )}

      {/* Scan dialog */}
      {showScan && (
        <ScanDialog
          projectId={projectId}
          onClose={() => setShowScan(false)}
          onImported={onImported}
        />
      )}
    </div>
  )
}
