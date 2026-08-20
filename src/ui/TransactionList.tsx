import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../app/store'
import type { Transaction } from '../domain/transaction'
import type { Category } from '../domain/category'
import type { Wallet } from '../domain/wallet'
import { Money, format } from '../domain/money'
import { compareIsoDate } from '../domain/iso-date'
import { groupByWeek, type WeekStartDay } from '../domain/week'

interface TransactionListProps {
  wallet: Wallet
  transactions: Transaction[]
  categories: Category[]
  weekStartDay: WeekStartDay
}

function categoryLabel(categories: Category[], categoryId: string | null): string {
  if (categoryId === null) return '未分類'
  const category = categories.find((c) => c.id === categoryId)
  return category ? `${category.icon} ${category.name}` : '未分類'
}

/** 週內依日期新到舊排序（groupByWeek 本身回傳日期正序，見 week.ts 交接筆記）。 */
function sortNewestFirst(items: readonly Transaction[]): Transaction[] {
  return [...items].sort((a, b) => {
    const byDate = compareIsoDate(b.date, a.date)
    if (byDate !== 0) return byDate
    return b.createdAt.localeCompare(a.createdAt)
  })
}

export default function TransactionList({
  wallet,
  transactions,
  categories,
  weekStartDay,
}: TransactionListProps) {
  const navigate = useNavigate()
  const deleteTransaction = useAppStore((s) => s.deleteTransaction)

  async function handleDelete(id: string) {
    if (!window.confirm('確定要刪除這筆交易嗎？')) return
    await deleteTransaction(id)
  }

  if (transactions.length === 0) {
    return <p className="p-6 text-center text-sm text-slate-400">本錢包還沒有任何交易</p>
  }

  const groups = groupByWeek(transactions, (t) => t.date, weekStartDay)

  return (
    <div data-testid="transaction-list" className="space-y-4">
      {groups.map((group) => (
        <div key={group.start}>
          <h4 data-testid="week-group-header" className="mb-1 px-1 text-xs font-medium text-slate-400">
            {group.start} ~ {group.end}
          </h4>
          <ul className="divide-y divide-slate-200 overflow-hidden rounded-lg bg-white shadow">
            {sortNewestFirst(group.items).map((t) => (
              <li
                key={t.id}
                data-testid="transaction-item"
                className="flex items-center justify-between px-4 py-3"
              >
                <div>
                  <p className="text-sm text-slate-500">{t.date}</p>
                  <p>{categoryLabel(categories, t.categoryId)}</p>
                  {t.note && <p className="text-xs text-slate-400">{t.note}</p>}
                </div>
                <div className="flex items-center gap-3">
                  <span className={t.type === 'expense' ? 'text-slate-900' : 'text-emerald-600'}>
                    {t.type === 'expense' ? '-' : '+'}
                    {format(Money.of(t.amount, wallet.currency))}
                  </span>
                  <button
                    type="button"
                    data-testid="edit-transaction"
                    className="text-sm text-slate-500 underline"
                    onClick={() => navigate(`/transactions/${t.id}/edit`)}
                  >
                    編輯
                  </button>
                  <button
                    type="button"
                    data-testid="delete-transaction"
                    className="text-sm text-red-600 underline"
                    onClick={() => handleDelete(t.id)}
                  >
                    刪除
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}
