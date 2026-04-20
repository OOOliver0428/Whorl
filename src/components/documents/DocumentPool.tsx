import { useState, useEffect, useCallback } from 'react'
import { useAppStore } from '../../store'
import { api, type Document } from '../../api'
import DocumentList from './DocumentList'

export default function DocumentPool() {
  const { currentProjectId } = useAppStore()
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortField, setSortField] = useState('created')

  const fetchDocuments = useCallback(async () => {
    if (!currentProjectId) return
    setLoading(true)
    try {
      const params: Record<string, string> = { project_id: String(currentProjectId) }
      if (searchQuery) params.search = searchQuery
      if (statusFilter !== 'all') params.status = statusFilter
      if (sortField) params.sort = sortField
      const docs = await api.getDocuments(params)
      setDocuments(docs)
    } finally {
      setLoading(false)
    }
  }, [currentProjectId, searchQuery, statusFilter, sortField])

  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments])

  useEffect(() => {
    if (!currentProjectId) return
    const checkChanges = async () => {
      setChecking(true)
      try {
        const allDocs = await api.getDocuments({ project_id: String(currentProjectId) })
        if (allDocs.length === 0) return
        await api.checkDocumentChanges(allDocs.map((d) => d.id))
        const params: Record<string, string> = { project_id: String(currentProjectId) }
        if (searchQuery) params.search = searchQuery
        if (statusFilter !== 'all') params.status = statusFilter
        if (sortField) params.sort = sortField
        const docs = await api.getDocuments(params)
        setDocuments(docs)
      } finally {
        setChecking(false)
      }
    }
    checkChanges()
  }, [currentProjectId])

  const handleRefresh = async (doc: Document) => {
    try {
      await api.refreshDocument(doc.id)
      await fetchDocuments()
    } catch {
      await fetchDocuments()
    }
  }

  const handleDelete = async (doc: Document) => {
    if (!confirm(`确定删除文档「${doc.name}」的记录？\n\n注意：这不会删除本地文件。`)) return
    await api.deleteDocument(doc.id)
    await fetchDocuments()
  }

  const handleRestore = async (doc: Document) => {
    await api.updateDocument(doc.id, { status: 'active' })
    await fetchDocuments()
  }

  return (
    <div className="space-y-2">
      {checking && (
        <div className="flex items-center gap-1.5 text-xs text-text-muted">
          <span className="h-3 w-3 animate-spin rounded-full border border-text-muted border-t-transparent" />
          检测变更中...
        </div>
      )}
      <DocumentList
        projectId={currentProjectId!}
        documents={documents}
        loading={loading}
        onRefresh={handleRefresh}
        onDelete={handleDelete}
        onRestore={handleRestore}
        onImported={fetchDocuments}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        sortField={sortField}
        onSortChange={setSortField}
      />
    </div>
  )
}
