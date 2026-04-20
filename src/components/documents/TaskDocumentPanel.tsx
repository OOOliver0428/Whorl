import { useState, useEffect } from 'react'
import { Plus, X, FileText, BookOpen, Upload } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { api, type Document, type TaskDocumentLink } from '../../api'

interface Props {
  taskId: number | null
  projectId: number | null
}

export default function TaskDocumentPanel({ taskId, projectId }: Props) {
  const [linked, setLinked] = useState<{ references: TaskDocumentLink[]; outputs: TaskDocumentLink[] }>({ references: [], outputs: [] })
  const [pool, setPool] = useState<Document[]>([])
  const [showPicker, setShowPicker] = useState(false)
  const [pickerRelation, setPickerRelation] = useState<'reference' | 'output'>('reference')

  // Load linked documents when editing existing task
  useEffect(() => {
    if (!taskId) return
    api.getTaskDocuments(taskId).then(setLinked).catch(() => {})
  }, [taskId])

  // Load project document pool for picker
  useEffect(() => {
    if (!projectId || !showPicker) return
    api.getDocuments({ project_id: String(projectId), status: 'active' }).then(setPool).catch(() => {})
  }, [projectId, showPicker])

  const handleLink = async (doc: Document) => {
    if (!taskId) return
    try {
      await api.linkTaskDocument(taskId, doc.id, pickerRelation)
      const updated = await api.getTaskDocuments(taskId)
      setLinked(updated)
      setShowPicker(false)
    } catch {
      // ignore duplicate
    }
  }

  const handleUnlink = async (docId: number) => {
    if (!taskId) return
    await api.unlinkTaskDocument(taskId, docId)
    const updated = await api.getTaskDocuments(taskId)
    setLinked(updated)
  }

  const openPicker = (relation: 'reference' | 'output') => {
    setPickerRelation(relation)
    setShowPicker(true)
  }

  // Filter out already linked documents
  const linkedIds = new Set([...linked.references, ...linked.outputs].map((d) => d.id))
  const available = pool.filter((d) => !linkedIds.has(d.id))

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-text-secondary">关联文档</label>

      {/* Reference docs */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5 text-xs text-text-muted">
          <BookOpen size={12} />
          <span>参考文档</span>
        </div>
        {linked.references.length > 0 ? (
          <div className="space-y-1">
            {linked.references.map((doc) => (
              <div key={doc.id} className="group flex items-center gap-2 rounded-lg bg-surface-hover px-3 py-2">
                <FileText size={14} className="shrink-0 text-text-muted" />
                <span className="flex-1 truncate text-sm text-text">{doc.name}</span>
                <button
                  onClick={() => handleUnlink(doc.id)}
                  className="shrink-0 rounded p-0.5 text-text-muted opacity-0 transition-all hover:text-danger group-hover:opacity-100"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-text-muted/60">暂无参考文档</p>
        )}
        {taskId && projectId && (
          <button
            onClick={() => openPicker('reference')}
            className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-primary transition-colors hover:bg-primary/10"
          >
            <Plus size={12} /> 添加参考文档
          </button>
        )}
      </div>

      {/* Output docs */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5 text-xs text-text-muted">
          <Upload size={12} />
          <span>产出文档</span>
        </div>
        {linked.outputs.length > 0 ? (
          <div className="space-y-1">
            {linked.outputs.map((doc) => (
              <div key={doc.id} className="group flex items-center gap-2 rounded-lg bg-surface-hover px-3 py-2">
                <FileText size={14} className="shrink-0 text-text-muted" />
                <span className="flex-1 truncate text-sm text-text">{doc.name}</span>
                <button
                  onClick={() => handleUnlink(doc.id)}
                  className="shrink-0 rounded p-0.5 text-text-muted opacity-0 transition-all hover:text-danger group-hover:opacity-100"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-text-muted/60">暂无产出文档</p>
        )}
        {taskId && projectId && (
          <button
            onClick={() => openPicker('output')}
            className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-primary transition-colors hover:bg-primary/10"
          >
            <Plus size={12} /> 添加产出文档
          </button>
        )}
      </div>

      {/* Document picker modal */}
      <AnimatePresence>
        {showPicker && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
            onClick={() => setShowPicker(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="mx-4 w-full max-w-md rounded-2xl border border-border bg-surface shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-border px-5 py-3">
                <h3 className="font-display text-sm font-semibold">
                  选择{pickerRelation === 'reference' ? '参考' : '产出'}文档
                </h3>
                <button onClick={() => setShowPicker(false)} className="rounded-lg p-1 text-text-muted hover:bg-surface-hover hover:text-text">
                  <X size={16} />
                </button>
              </div>
              <div className="max-h-64 overflow-y-auto p-2">
                {available.length === 0 ? (
                  <div className="py-8 text-center text-sm text-text-muted">
                    没有可选的文档
                  </div>
                ) : (
                  available.map((doc) => (
                    <button
                      key={doc.id}
                      onClick={() => handleLink(doc)}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-surface-hover"
                    >
                      <FileText size={16} className="shrink-0 text-text-muted" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm text-text">{doc.name}</div>
                        <div className="truncate text-xs text-text-muted">{doc.file_path}</div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
