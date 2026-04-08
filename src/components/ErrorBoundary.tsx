import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-4 p-8">
          <div className="rounded-2xl border border-border bg-surface p-8 text-center shadow-sm">
            <h2 className="mb-2 font-display text-lg font-semibold text-text">出了点问题</h2>
            <p className="mb-4 text-sm text-text-muted">{this.state.error?.message || '未知错误'}</p>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-hover"
            >
              重试
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
