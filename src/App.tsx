import { useEffect, lazy, Suspense } from 'react'
import { useAppStore } from './store'
import { useThemeStore } from './store/theme'
import Sidebar from './components/layout/Sidebar'
import Header from './components/layout/Header'
import TaskList from './components/tasks/TaskList'
import TaskTimeline from './components/tasks/TaskTimeline'
import TaskForm from './components/tasks/TaskForm'
import PomodoroTimer from './components/pomodoro/PomodoroTimer'
import ErrorBoundary from './components/ErrorBoundary'
import { useState } from 'react'

const StatsDashboard = lazy(() => import('./components/stats/StatsDashboard'))

function Loading() {
  return (
    <div className="flex h-64 items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  )
}

export default function App() {
  const { currentView, currentProjectId, viewMode, fetchProjects, fetchTags, fetchTasks } = useAppStore()
  useThemeStore()
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    fetchProjects()
    fetchTags()
  }, [])

  useEffect(() => {
    fetchTasks()
  }, [currentView, currentProjectId, viewMode])

  return (
    <div className="noise-bg flex h-screen overflow-hidden bg-bg text-text">
      <Sidebar />
      <main className="flex flex-1 flex-col overflow-hidden">
        <Header onAddTask={() => setShowForm(true)} />
        <div className="flex-1 overflow-y-auto p-6">
          <ErrorBoundary>
            {currentView === 'stats' ? (
              <Suspense fallback={<Loading />}>
                <StatsDashboard />
              </Suspense>
            ) : currentView === 'pomodoro' ? (
              <PomodoroTimer />
            ) : viewMode === 'timeline' ? (
              <TaskTimeline />
            ) : (
              <TaskList />
            )}
          </ErrorBoundary>
        </div>
      </main>
      {showForm && <TaskForm onClose={() => setShowForm(false)} />}
    </div>
  )
}
