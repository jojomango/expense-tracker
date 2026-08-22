import { useEffect } from 'react'
import { HashRouter, Link, Route, Routes } from 'react-router-dom'
import { useAppStore } from './store'
import Home from '../ui/Home'
import Wallets from '../ui/Wallets'
import Settings from '../ui/Settings'
import Categories from '../ui/Categories'
import Stats from '../ui/Stats'
import { NewWalletPage, EditWalletPage } from '../ui/WalletPages'
import { NewTransactionPage, EditTransactionPage } from '../ui/TransactionPages'
import { NewCategoryPage, EditCategoryPage } from '../ui/CategoryPages'

export default function App() {
  const load = useAppStore((s) => s.load)

  useEffect(() => {
    void load()
  }, [load])

  return (
    <HashRouter>
      <div className="min-h-dvh bg-slate-50 text-slate-900">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
          <Link to="/">
            <h1 className="text-lg font-semibold">記帳本</h1>
          </Link>
          <nav className="flex items-center gap-4 text-sm text-slate-500">
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
      </div>
    </HashRouter>
  )
}
