import { useMemo, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../app/store'
import type { Transaction, TransactionType } from '../domain/transaction'
import { parse } from '../domain/money'
import { todayIso, toIsoDate, type IsoDate } from '../domain/iso-date'
import type { Wallet } from '../domain/wallet'

interface TransactionFormProps {
  wallet: Wallet
  initial?: Transaction
}

export default function TransactionForm({ wallet, initial }: TransactionFormProps) {
  const navigate = useNavigate()
  const categories = useAppStore((s) => s.categories)
  const addTransaction = useAppStore((s) => s.addTransaction)
  const updateTransaction = useAppStore((s) => s.updateTransaction)

  const [type, setType] = useState<TransactionType>(initial?.type ?? 'expense')
  const optionsForType = useMemo(
    () => categories.filter((c) => c.type === type),
    [categories, type],
  )

  const [amountInput, setAmountInput] = useState(
    initial ? String(initial.amount / 10 ** (wallet.currency === 'JPY' ? 0 : 2)) : '',
  )
  const [categoryId, setCategoryId] = useState<string>(
    initial?.categoryId ?? optionsForType[0]?.id ?? '',
  )
  const [date, setDate] = useState<IsoDate>(initial?.date ?? todayIso(new Date()))
  const [note, setNote] = useState(initial?.note ?? '')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  function handleTypeChange(nextType: TransactionType) {
    setType(nextType)
    const firstOfType = categories.find((c) => c.type === nextType)
    setCategoryId(firstOfType?.id ?? '')
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      const amount = parse(amountInput, wallet.currency).amount
      const noteField = note ? { note } : {}
      setSubmitting(true)
      if (initial) {
        await updateTransaction(initial.id, {
          type,
          amount,
          categoryId: categoryId || null,
          date,
          ...noteField,
        })
      } else {
        await addTransaction({
          walletId: wallet.id,
          type,
          amount,
          categoryId: categoryId || null,
          date,
          ...noteField,
        })
      }
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-sm space-y-4 p-6">
      <h1 className="text-xl font-semibold">{initial ? '編輯交易' : '新增交易'}</h1>

      <div className="flex gap-2">
        <button
          type="button"
          data-testid="type-expense"
          onClick={() => handleTypeChange('expense')}
          className={`flex-1 rounded px-3 py-2 ${
            type === 'expense' ? 'bg-slate-900 text-white' : 'bg-slate-100'
          }`}
        >
          支出
        </button>
        <button
          type="button"
          data-testid="type-income"
          onClick={() => handleTypeChange('income')}
          className={`flex-1 rounded px-3 py-2 ${
            type === 'income' ? 'bg-slate-900 text-white' : 'bg-slate-100'
          }`}
        >
          收入
        </button>
      </div>

      <div>
        <label htmlFor="transaction-amount" className="block text-sm font-medium">
          金額
        </label>
        <input
          id="transaction-amount"
          inputMode="decimal"
          className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          value={amountInput}
          onChange={(e) => setAmountInput(e.target.value)}
          required
        />
      </div>

      <div>
        <label htmlFor="transaction-category" className="block text-sm font-medium">
          分類
        </label>
        <select
          id="transaction-category"
          className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
        >
          {optionsForType.map((c) => (
            <option key={c.id} value={c.id}>
              {c.icon} {c.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="transaction-date" className="block text-sm font-medium">
          日期
        </label>
        <input
          id="transaction-date"
          type="date"
          className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          value={date}
          onChange={(e) => setDate(toIsoDate(e.target.value))}
          required
        />
      </div>

      <div>
        <label htmlFor="transaction-note" className="block text-sm font-medium">
          備註
        </label>
        <input
          id="transaction-note"
          className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
      >
        送出
      </button>
    </form>
  )
}
