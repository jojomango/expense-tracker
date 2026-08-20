import { Link } from 'react-router-dom'
import { useAppStore, selectCurrentWallet } from '../app/store'
import WalletForm from './WalletForm'
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
      <div className="rounded-lg bg-white p-4 shadow">
        <p className="text-sm text-slate-500">本週餘額</p>
        <p
          data-testid="weekly-balance"
          className={`text-2xl font-semibold ${result.isOverBudget ? 'text-red-600' : 'text-slate-900'}`}
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
      <div className="rounded-lg bg-white p-4 shadow">
        <p className="text-sm text-slate-500">剩餘總預算</p>
        <p
          data-testid="total-balance"
          className={`text-2xl font-semibold ${result.isOverBudget ? 'text-red-600' : 'text-slate-900'}`}
        >
          {format(result.balance)}
        </p>
        <p className="text-sm text-slate-500">已用 {result.usedPercent}%</p>
        {result.isOverBudget && <OverBudgetNotice />}
      </div>
    )
  }

  const total = calculateWeeklyExpenseTotal(wallet, transactions, weekStartDay, now)
  return (
    <div className="rounded-lg bg-white p-4 shadow">
      <p className="text-sm text-slate-500">本週支出</p>
      <p data-testid="weekly-expense-total" className="text-2xl font-semibold">
        {format(total)}
      </p>
    </div>
  )
}

export default function Home() {
  const status = useAppStore((s) => s.status)
  const wallets = useAppStore((s) => s.wallets)
  const wallet = useAppStore(selectCurrentWallet)
  const transactions = useAppStore((s) => s.transactions)
  const categories = useAppStore((s) => s.categories)
  const weekStartDay = useAppStore((s) => s.settings.weekStartDay)
  const createWallet = useAppStore((s) => s.createWallet)

  if (status === 'loading') {
    return <p className="p-6 text-center text-slate-400">載入中…</p>
  }

  if (wallets.length === 0) {
    return (
      <WalletForm
        heading="建立第一個錢包"
        submitLabel="建立錢包"
        onSubmit={async (values) => {
          await createWallet(values)
        }}
      />
    )
  }

  if (!wallet) {
    return <p className="p-6 text-center text-slate-400">沒有可用的錢包</p>
  }

  const walletTransactions = transactions.filter((t) => t.walletId === wallet.id)

  return (
    <div className="mx-auto max-w-md space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h2 data-testid="current-wallet-name" className="text-lg font-semibold">
          {wallet.name}
        </h2>
        <Link to="/wallets" className="text-sm text-slate-500 underline">
          管理錢包
        </Link>
      </div>

      <BalanceCard />

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-slate-500">交易紀錄</h3>
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
