interface Props {
  activeTab: 'tasks' | 'documents'
  onTabChange: (tab: 'tasks' | 'documents') => void
  taskCount?: number
  docCount?: number
}

export default function ProjectTabs({ activeTab, onTabChange, taskCount, docCount }: Props) {
  return (
    <div className="flex items-center gap-1 border-b border-border">
      <button
        onClick={() => onTabChange('tasks')}
        className={`relative px-4 py-2.5 text-sm font-medium transition-colors ${
          activeTab === 'tasks' ? 'text-primary' : 'text-text-muted hover:text-text'
        }`}
      >
        任务
        {taskCount !== undefined && taskCount > 0 && (
          <span className="ml-1.5 rounded-full bg-primary/10 px-2 py-0.5 text-xs">
            {taskCount}
          </span>
        )}
        {activeTab === 'tasks' && (
          <div className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-primary" />
        )}
      </button>
      <button
        onClick={() => onTabChange('documents')}
        className={`relative px-4 py-2.5 text-sm font-medium transition-colors ${
          activeTab === 'documents' ? 'text-primary' : 'text-text-muted hover:text-text'
        }`}
      >
        文档
        {docCount !== undefined && docCount > 0 && (
          <span className="ml-1.5 rounded-full bg-primary/10 px-2 py-0.5 text-xs">
            {docCount}
          </span>
        )}
        {activeTab === 'documents' && (
          <div className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-primary" />
        )}
      </button>
    </div>
  )
}
