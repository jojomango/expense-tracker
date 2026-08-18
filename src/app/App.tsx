import { useEffect } from 'react'
import { HashRouter, Route, Routes } from 'react-router-dom'
import { useAppStore } from './store'
import Home from '../ui/Home'
import Wallets from '../ui/Wallets'
import { NewWalletPage, EditWalletPage } from '../ui/WalletPages'
import { NewTransactionPage, EditTransactionPage } from '../ui/TransactionPages'

export default function App() {
  const load = useAppStore((s) => s.load)

  useEffect(() => {
    void load()
  }, [load])

  return (
    <HashRouter>
      <div className="min-h-dvh bg-slate-50 text-slate-900">
        <header className="border-b border-slate-200 bg-white px-4 py-3">
          <h1 className="text-lg font-semibold">記帳本</h1>
        </header>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/wallets" element={<Wallets />} />
          <Route path="/wallets/new" element={<NewWalletPage />} />
          <Route path="/wallets/:id/edit" element={<EditWalletPage />} />
          <Route path="/transactions/new" element={<NewTransactionPage />} />
          <Route path="/transactions/:id/edit" element={<EditTransactionPage />} />
        </Routes>
      </div>
    </HashRouter>
  )
}
