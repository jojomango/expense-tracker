import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../app/store'
import type { Transaction } from '../domain/transaction'
import type { Category } from '../domain/category'
import type { Wallet } from '../domain/wallet'
import { Money, format } from '../domain/money'
import { compareIsoDate } from '../domain/iso-date'

interface TransactionListProps {
  wallet: Wallet
  transactions: Transaction[]
  categories: Category[]
}

function categoryLabel(categories: Category[], categoryId: string | null): string {
  if (categoryId === null) return '未分類'
  const category = categories.find((c) => c.id === categoryId)
  return category ? `${category.icon} ${category.name}` : '未分類'
}

export default function TransactionList({ wallet, transactions, categories }: TransactionListProps) {
  const navigate = useNavigate()
  const deleteTransaction = useAppStore((s) => s.deleteTransaction)

  const sorted = [...transactions].sort((a, b) => {
    const byDate = compareIsoDate(b.date, a.date)
    if (byDate !== 0) return byDate
    return b.createdAt.localeCompare(a.createdAt)
  })

  async function handleDelete(id: string) {
    if (!window.confirm('確定要刪除這筆交易嗎？')) return
    await deleteTransaction(id)
  }

  if (sorted.length === 0) {
    return <p className="p-6 text-center text-sm text-slate-400">本錢包還沒有任何交易</p>
  }

  return (
    <ul data-testid="transaction-list" className="divide-y divide-slate-200">
      {sorted.map((t) => (
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
  )
}
