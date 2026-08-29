import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

/**
 * 全域錯誤邊界（SPEC.md §6 Phase 7「錯誤處理」）——避免單一畫面的 render
 * 錯誤把整個 app 白畫面掉，至少讓使用者看到「發生錯誤」並能重新整理。
 * 資料本身留在 IndexedDB 不會遺失（純本地儲存，不受這個錯誤影響）。
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('未預期的錯誤', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div role="alert" className="mx-auto max-w-sm space-y-3 p-6 text-center">
          <p className="text-lg font-semibold">發生未預期的錯誤</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            你的資料仍安全保存在裝置上。重新整理頁面通常可以解決問題。
          </p>
          <button
            type="button"
            className="rounded bg-slate-900 px-4 py-2 text-sm text-white dark:bg-slate-100 dark:text-slate-900"
            onClick={() => window.location.reload()}
          >
            重新整理
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
