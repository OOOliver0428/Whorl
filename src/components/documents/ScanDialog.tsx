import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, FolderOpen, FileText, Loader2, AlertTriangle } from 'lucide-react'
import { api, type ScannedFile } from '../../api'

interface Props {
  projectId: number
  onClose: () => void
  onImported: () => void
}

const EXTENSION_OPTIONS = [
  { label: '全部文档', value: '' },
  { label: 'Visio', value: 'vsdx' },
  { label: 'PDF', value: 'pdf' },
  { label: 'draw.io', value: 'drawio' },
  { label: 'Office', value: 'office' },
  { label: '图片', value: 'image' },
  { label: '文本', value: 'text' },
]

const EXTENSION_MAP: Record<string, string[]> = {
  'vsdx': ['.vsdx'],
  'pdf': ['.pdf'],
  'drawio': ['.drawio'],
  'office': ['.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx'],
  'image': ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp'],
  'text': ['.txt', '.md', '.csv', '.json', '.xml', '.yaml', '.yml'],
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function ScanDialog({ projectId, onClose, onImported }: Props) {
  const [dirPath, setDirPath] = useState('')
  const [extFilter, setExtFilter] = useState('')
  const [scanning, setScanning] = useState(false)
  const [importing, setImporting] = useState(false)
  const [files, setFiles] = useState<ScannedFile[]>([])
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [truncated, setTruncated] = useState(false)
  const [error, setError] = useState('')
  const [scanDone, setScanDone] = useState(false)

  const handleScan = async () => {
    if (!dirPath.trim()) return
    setScanning(true)
    setError('')
    setFiles([])
    setSelected(new Set())
    setScanDone(false)

    try {
      const exts = extFilter ? EXTENSION_MAP[extFilter] : undefined
      const result = await api.scanDirectory(dirPath.trim(), exts)
      setFiles(result.files)
      setTruncated(result.truncated)
      setSelected(new Set(result.files.map((_, i) => i)))
      setScanDone(true)
    } catch (err: any) {
      setError(err.message || '扫描失败')
    } finally {
      setScanning(false)
    }
  }

  const toggleSelect = (index: number) => {
    const next = new Set(selected)
    if (next.has(index)) next.delete(index)
    else next.add(index)
    setSelected(next)
  }

  const toggleAll = () => {
    if (selected.size === files.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(files.map((_, i) => i)))
    }
  }

  const handleImport = async () => {
    const selectedFiles = files.filter((_, i) => selected.has(i))
    if (selectedFiles.length === 0) return

    setImporting(true)
    try {
      await api.importDocuments(projectId, selectedFiles)
      onImported()
      onClose()
    } catch (err: any) {
      setError(err.message || '导入失败')
    } finally {
      setImporting(false)
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="mx-4 flex max-h-[80vh] w-full max-w-2xl flex-col rounded-2xl border border-border bg-surface shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
              <FolderOpen size={20} className="text-primary" />
              导入文档
            </h2>
            <button onClick={onClose} className="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-surface-hover hover:text-text">
              <X size={18} />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {/* Scan controls */}
            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={dirPath}
                  onChange={(e) => setDirPath(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleScan()}
                  placeholder="输入目录路径，如 /home/xxx/docs 或 C:\\Users\\xxx\\docs"
                  className="flex-1 rounded-xl border border-border bg-bg px-4 py-2.5 text-sm text-text outline-none transition-colors placeholder:text-text-muted focus:border-primary"
                />
                <select
                  value={extFilter}
                  onChange={(e) => setExtFilter(e.target.value)}
                  className="rounded-xl border border-border bg-bg px-3 py-2.5 text-sm text-text outline-none transition-colors focus:border-primary"
                >
                  {EXTENSION_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <button
                  onClick={handleScan}
                  disabled={scanning || !dirPath.trim()}
                  className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-primary-hover disabled:opacity-50"
                >
                  {scanning ? <Loader2 size={16} className="animate-spin" /> : null}
                  扫描
                </button>
              </div>

              {error && (
                <div className="flex items-center gap-2 rounded-xl bg-danger/10 px-4 py-2.5 text-sm text-danger">
                  <AlertTriangle size={16} />
                  {error}
                </div>
              )}
            </div>

            {/* Scan results */}
            {scanDone && (
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-secondary">
                    扫描结果 · {files.length} 个文件
                    {truncated && <span className="ml-1 text-warning">（已截断，最多 500 个）</span>}
                  </span>
                  <button onClick={toggleAll} className="text-xs text-primary hover:underline">
                    {selected.size === files.length ? '取消全选' : '全选'}
                  </button>
                </div>

                <div className="max-h-64 overflow-y-auto rounded-xl border border-border">
                  {files.map((file, i) => (
                    <label
                      key={file.file_path}
                      className={`flex cursor-pointer items-center gap-3 border-b border-border-subtle px-4 py-2.5 last:border-b-0 transition-colors hover:bg-surface-hover ${
                        selected.has(i) ? 'bg-primary/5' : ''
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selected.has(i)}
                        onChange={() => toggleSelect(i)}
                        className="checkbox-done !h-4 !w-4 !rounded-sm accent-primary"
                      />
                      <FileText size={16} className="shrink-0 text-text-muted" />
                      <div className="flex-1 min-w-0">
                        <div className="truncate text-sm text-text">{file.name}</div>
                        <div className="truncate text-xs text-text-muted">{file.file_path}</div>
                      </div>
                      <span className="shrink-0 text-xs text-text-muted">{formatSize(file.file_size)}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-4">
            <button
              onClick={onClose}
              className="rounded-xl px-5 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-hover"
            >
              取消
            </button>
            <button
              onClick={handleImport}
              disabled={importing || selected.size === 0}
              className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-primary-hover disabled:opacity-50"
            >
              {importing ? <Loader2 size={16} className="animate-spin" /> : null}
              导入 {selected.size > 0 ? `${selected.size} 个` : ''}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
