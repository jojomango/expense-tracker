import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAppStore, selectCurrentWallet } from '../app/store'
import WalletForm from './WalletForm'
import WalletSheet from './WalletSheet'
import TransactionList from './TransactionList'
import { calculateWeeklyBalance, calculateTotalBalance, calculateWeeklyExpenseTotal } from '../domain/budget'
import { format } from '../domain/money'

function OverBudgetNotice() {
  return (
    <p className="flex items-center gap-1 text-sm text-red-600">
      <span data-testid="over-budget-icon" role="img" aria-label="警示">
        ⚠️
      </span>
      已超支
    </p>
  )
}

function BalanceCard() {
  const wallet = useAppStore(selectCurrentWallet)
  const transactions = useAppStore((s) => s.transactions)
  const weekStartDay = useAppStore((s) => s.settings.weekStartDay)

  if (!wallet) return null
  const now = new Date()

  if (wallet.budgetMode === 'weekly') {
    const result = calculateWeeklyBalance(wallet, transactions, weekStartDay, now)
    if (!result) return null
    return (
      <div className="rounded-lg bg-white p-4 shadow dark:bg-slate-900">
        <p className="text-sm text-slate-500 dark:text-slate-400">本週餘額</p>
        <p
          data-testid="weekly-balance"
          className={`text-2xl font-semibold ${result.isOverBudget ? 'text-red-600' : 'text-slate-900 dark:text-slate-100'}`}
        >
          {format(result.balance)}
        </p>
        {result.isOverBudget && <OverBudgetNotice />}
      </div>
    )
  }

  if (wallet.budgetMode === 'total') {
    const result = calculateTotalBalance(wallet, transactions)
    if (!result) return null
    return (
      <div className="rounded-lg bg-white p-4 shadow dark:bg-slate-900">
        <p className="text-sm text-slate-500 dark:text-slate-400">剩餘總預算</p>
        <p
          data-testid="total-balance"
          className={`text-2xl font-semibold ${result.isOverBudget ? 'text-red-600' : 'text-slate-900 dark:text-slate-100'}`}
        >
          {format(result.balance)}
        </p>
        <p className="text-sm text-slate-500 dark:text-slate-400">已用 {result.usedPercent}%</p>
        {result.isOverBudget && <OverBudgetNotice />}
      </div>
    )
  }

  const total = calculateWeeklyExpenseTotal(wallet, transactions, weekStartDay, now)
  return (
    <div className="rounded-lg bg-white p-4 shadow dark:bg-slate-900">
      <p className="text-sm text-slate-500 dark:text-slate-400">本週支出</p>
      <p data-testid="weekly-expense-total" className="text-2xl font-semibold">
        {format(total)}
      </p>
    </div>
  )
}

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

      <BalanceCard />

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-slate-500 dark:text-slate-400">交易紀錄</h3>
        <Link
          to="/transactions/new"
          data-testid="add-transaction-button"
          className="rounded bg-slate-900 px-3 py-1.5 text-sm text-white"
        >
          ＋ 新增
        </Link>
      </div>

      <TransactionList
        wallet={wallet}
        transactions={walletTransactions}
        categories={categories}
        weekStartDay={weekStartDay}
      />
    </div>
  )
}
