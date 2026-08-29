import { useEffect } from 'react'
import { HashRouter, Link, Route, Routes } from 'react-router-dom'
import { useAppStore } from './store'
import Home from '../ui/Home'
import Wallets from '../ui/Wallets'
import Settings from '../ui/Settings'
import Categories from '../ui/Categories'
import Stats from '../ui/Stats'
import ErrorBoundary from '../ui/ErrorBoundary'
import { NewWalletPage, EditWalletPage } from '../ui/WalletPages'
import { NewTransactionPage, EditTransactionPage } from '../ui/TransactionPages'
import { NewCategoryPage, EditCategoryPage } from '../ui/CategoryPages'

/**
 * 依 settings.theme 套用 `dark` class 到 `<html>`（Tailwind `darkMode: 'class'`）。
 * `system` 模式讀 `window.matchMedia`，並訂閱變更即時反應——這屬於 app 層讀取
 * 瀏覽器狀態，domain 層本身完全不知道「深色模式」這件事。
 */
function useAppliedTheme() {
  const theme = useAppStore((s) => s.settings.theme)

  useEffect(() => {
    const root = document.documentElement
    const media = window.matchMedia('(prefers-color-scheme: dark)')

    function apply() {
      const isDark = theme === 'dark' || (theme === 'system' && media.matches)
      root.classList.toggle('dark', isDark)
    }

    apply()
    if (theme === 'system') {
      media.addEventListener('change', apply)
      return () => media.removeEventListener('change', apply)
    }
    return undefined
  }, [theme])
}

export default function App() {
  const load = useAppStore((s) => s.load)

  useEffect(() => {
    void load()
  }, [load])

  useAppliedTheme()

  return (
    <HashRouter>
      <div className="min-h-dvh bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
          <Link to="/">
            <h1 className="text-lg font-semibold">記帳本</h1>
          </Link>
          <nav className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
            <Link to="/categories" className="underline">
              分類
            </Link>
            <Link to="/stats" className="underline">
              統計
            </Link>
            <Link to="/settings" className="underline">
              設定
            </Link>
          </nav>
        </header>
        <ErrorBoundary>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/wallets" element={<Wallets />} />
            <Route path="/wallets/new" element={<NewWalletPage />} />
            <Route path="/wallets/:id/edit" element={<EditWalletPage />} />
            <Route path="/transactions/new" element={<NewTransactionPage />} />
            <Route path="/transactions/:id/edit" element={<EditTransactionPage />} />
            <Route path="/categories" element={<Categories />} />
            <Route path="/categories/new" element={<NewCategoryPage />} />
            <Route path="/categories/:id/edit" element={<EditCategoryPage />} />
            <Route path="/stats" element={<Stats />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </ErrorBoundary>
      </div>
    </HashRouter>
  )
}
