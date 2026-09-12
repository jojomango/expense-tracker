import { useAppStore, selectCurrentWallet } from '../app/store'
import {
  calculateWeeklyBalance,
  calculateTotalBalance,
  calculateWeeklyExpenseTotal,
  daysLeftInWeek,
  dailyAllowance,
} from '../domain/budget'
import { Money, format, percentOf, subtract } from '../domain/money'

/**
 * 首頁預算卡（UI-SPEC.md §4.2）。從 Home.tsx 抽出（Phase 10）。
 *
 * 「還有 {n} 天」／「日均可用」這兩行只在 `weekly` 模式顯示——`total` 模式的
 * 預算「不受週期影響」（SPEC.md §3.4），沒有「本週」這個框架，顯示以週為基準
 * 的天數／日均可用容易誤導使用者以為總預算會在那天歸零。這是 PR #13 review
 * 時人類明確做的決定（原本兩種模式統一顯示是待確認事項，已確認拿掉）。
 */
export default function BudgetCard() {
  const wallet = useAppStore(selectCurrentWallet)
  const transactions = useAppStore((s) => s.transactions)
  const weekStartDay = useAppStore((s) => s.settings.weekStartDay)

  if (!wallet) return null
  const now = new Date()

  if (wallet.budgetMode === 'none') {
    const total = calculateWeeklyExpenseTotal(wallet, transactions, weekStartDay, now)
    return (
      <div className="rounded-card bg-card p-[22px] shadow-card">
        <p className="text-label text-fg2">本週支出</p>
        <p data-testid="weekly-expense-total" className="text-balance tabular-nums text-fg">
          {format(total)}
        </p>
      </div>
    )
  }

  let balance: Money
  let budget: Money
  let spent: Money
  let isOverBudget: boolean
  let label: string
  let balanceTestId: string
  const isWeekly = wallet.budgetMode === 'weekly'

  if (isWeekly) {
    const result = calculateWeeklyBalance(wallet, transactions, weekStartDay, now)
    if (!result || wallet.budgetAmount === null) return null
    budget = Money.of(wallet.budgetAmount, wallet.currency)
    spent = calculateWeeklyExpenseTotal(wallet, transactions, weekStartDay, now)
    balance = result.balance
    isOverBudget = result.isOverBudget
    label = '本週還可以花'
    balanceTestId = 'weekly-balance'
  } else {
    const result = calculateTotalBalance(wallet, transactions)
    if (!result || wallet.budgetAmount === null) return null
    budget = Money.of(wallet.budgetAmount, wallet.currency)
    balance = result.balance
    // balance = budget − spent（budget.ts 內部算法），反推 spent 不需要新的 domain 函式。
    spent = subtract(budget, balance)
    isOverBudget = result.isOverBudget
    label = '總預算還剩'
    balanceTestId = 'total-balance'
  }

  const usedPercent = Math.min(100, percentOf(spent, budget))
  const balanceColorClass = isOverBudget ? 'text-danger' : 'text-fg'
  const barColorClass = isOverBudget ? 'bg-danger' : 'bg-accent'

  return (
    <div className="rounded-card bg-card p-[22px] shadow-card">
      <p className="text-label text-fg2">{label}</p>
      <p className="flex items-baseline gap-3 text-balance tabular-nums">
        <span data-testid={balanceTestId} className={balanceColorClass}>
          {format(balance)}
        </span>
        {isOverBudget && (
          <span data-testid="over-budget-label" className="text-label text-danger">
            已超支
          </span>
        )}
      </p>

      <div
        data-testid="budget-progress-bar"
        data-percent={usedPercent}
        className="mt-3 h-2 w-full overflow-hidden rounded-pill bg-track"
      >
        <div className={`h-full rounded-pill ${barColorClass}`} style={{ width: `${usedPercent}%` }} />
      </div>

      <div className="mt-2 flex items-center justify-between text-caption text-fg2">
        <span data-testid="budget-used-text">
          已用 {format(spent)} / {format(budget)}
        </span>
        {isWeekly && <span data-testid="budget-days-left">還有 {daysLeftInWeek(weekStartDay, now)} 天</span>}
      </div>

      {isWeekly && (
        <div className="mt-3 flex items-center justify-between border-t border-sep pt-3">
          <span className="text-caption text-fg2">日均可用</span>
          <span data-testid="budget-daily-allowance" className="text-[15px] font-medium text-fg">
            {format(dailyAllowance(balance, daysLeftInWeek(weekStartDay, now)))}
          </span>
        </div>
      )}
    </div>
  )
}
