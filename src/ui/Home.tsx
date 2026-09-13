import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAppStore, selectCurrentWallet } from '../app/store'
import WalletForm from './WalletForm'
import WalletSheet from './WalletSheet'
import TransactionList from './TransactionList'
import BudgetCard from './BudgetCard'

export default function Home() {
  const [sheetOpen, setSheetOpen] = useState(false)
  const status = useAppStore((s) => s.status)
  const wallets = useAppStore((s) => s.wallets)
  const wallet = useAppStore(selectCurrentWallet)
  const transactions = useAppStore((s) => s.transactions)
  const categories = useAppStore((s) => s.categories)
  const weekStartDay = useAppStore((s) => s.settings.weekStartDay)
  const createWallet = useAppStore((s) => s.createWallet)

  if (status === 'loading') {
    return <p className="p-6 text-center text-slate-400 dark:text-slate-500">載入中…</p>
  }

  if (wallets.length === 0) {
    // 就算還沒有任何錢包，也要能到設定頁——匯入備份還原成第一步是規劃中的流程
    // （SPEC.md §3.6：換裝置時用匯入取代手動重建錢包），所以「設定」入口不能只
    // 掛在下面「已有錢包」那個分支的標題列。
    return (
      <div className="mx-auto max-w-md p-4">
        <div className="mb-2 flex justify-end">
          <Link to="/settings" data-testid="settings-link" className="text-[15px] text-accent">
            設定
          </Link>
        </div>
        <WalletForm
          heading="建立第一個錢包"
          submitLabel="建立錢包"
          onSubmit={async (values) => {
            await createWallet(values)
          }}
        />
      </div>
    )
  }

  if (!wallet) {
    return <p className="p-6 text-center text-slate-400 dark:text-slate-500">沒有可用的錢包</p>
  }

  const walletTransactions = transactions.filter((t) => t.walletId === wallet.id)

  return (
    <div className="mx-auto max-w-md space-y-4 p-4">
      <div data-testid="home-title-bar" className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          aria-label="切換錢包"
          className="flex items-center gap-1 text-nav-title text-fg"
        >
          <span data-testid="current-wallet-name">{wallet.name}</span>
          <span aria-hidden="true" className="text-[11px] text-fg2">
            ▾
          </span>
        </button>
        <Link to="/settings" data-testid="settings-link" className="text-[15px] text-accent">
          設定
        </Link>
      </div>

      {sheetOpen && <WalletSheet onClose={() => setSheetOpen(false)} />}

      <BudgetCard />

      <TransactionList
        wallet={wallet}
        transactions={walletTransactions}
        categories={categories}
        weekStartDay={weekStartDay}
      />
    </div>
  )
}
