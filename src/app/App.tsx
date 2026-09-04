import { useEffect } from 'react'
import { HashRouter, Route, Routes } from 'react-router-dom'
import { useAppStore } from './store'
import Home from '../ui/Home'
import Wallets from '../ui/Wallets'
import Settings from '../ui/Settings'
import Categories from '../ui/Categories'
import Stats from '../ui/Stats'
import ErrorBoundary from '../ui/ErrorBoundary'
import BottomTabBar from '../ui/BottomTabBar'
import ToastHost from '../ui/Toast'
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
      <div className="min-h-dvh bg-bg font-sans text-fg">
        {/* UI-SPEC.md §3.1：底部分頁列取代標題列連結，這裡不再有共用的 <header>。
            pb-24 讓內容不被固定在底部的分頁列蓋住（分頁列高 84px，多留一點餘裕）。 */}
        <div className="safe-top pb-24">
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
        <BottomTabBar />
        <ToastHost />
      </div>
    </HashRouter>
  )
}
