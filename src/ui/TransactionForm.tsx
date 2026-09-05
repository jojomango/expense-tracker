import { useMemo, useState, type ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../app/store'
import type { Transaction, TransactionType } from '../domain/transaction'
import { parse } from '../domain/money'
import { decimalsFor, symbolFor } from '../domain/currency'
import { todayIso, toIsoDate, compareIsoDate, type IsoDate } from '../domain/iso-date'
import { shiftIsoDate } from '../domain/week'
import type { Wallet } from '../domain/wallet'
import { sortCategoriesForDisplay } from '../domain/category'
import { appendDigit, deleteDigit, formatAmountDisplay } from './amount-pad'
import AmountPad from './AmountPad'
import CategoryGrid from './CategoryGrid'
import { showToast } from './Toast'

interface TransactionFormProps {
  wallet: Wallet
  initial?: Transaction
}

type DatePreset = 'today' | 'yesterday' | 'custom'

/** 把交易的最小單位金額還原成記帳頁鍵台使用的整數位字串（無小數點，見交接筆記）。 */
function digitsFromAmount(amount: number, currency: string): string {
  const major = Math.round(amount / 10 ** decimalsFor(currency))
  return major === 0 ? '' : String(major)
}

export default function TransactionForm({ wallet, initial }: TransactionFormProps) {
  const navigate = useNavigate()
  const categories = useAppStore((s) => s.categories)
  const addTransaction = useAppStore((s) => s.addTransaction)
  const updateTransaction = useAppStore((s) => s.updateTransaction)

  const now = new Date()
  const todayStr = todayIso(now)
  const yesterdayStr = shiftIsoDate(todayStr, -1)

  const [type, setType] = useState<TransactionType>(initial?.type ?? 'expense')
  const optionsForType = useMemo(
    () => sortCategoriesForDisplay(categories.filter((c) => c.type === type)),
    [categories, type],
  )

  const [amountDigits, setAmountDigits] = useState(
    initial ? digitsFromAmount(initial.amount, wallet.currency) : '',
  )
  const [categoryId, setCategoryId] = useState<string>(
    initial?.categoryId ?? optionsForType[0]?.id ?? '',
  )

  const initialPreset: DatePreset =
    initial === undefined || initial.date === todayStr
      ? 'today'
      : initial.date === yesterdayStr
        ? 'yesterday'
        : 'custom'
  const [datePreset, setDatePreset] = useState<DatePreset>(initialPreset)
  const [customDate, setCustomDate] = useState<IsoDate>(initial?.date ?? todayStr)

  const [noteOpen, setNoteOpen] = useState(Boolean(initial?.note))
  const [note, setNote] = useState(initial?.note ?? '')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const date: IsoDate =
    datePreset === 'today' ? todayStr : datePreset === 'yesterday' ? yesterdayStr : customDate

  const isZero = amountDigits === '' || /^0+$/.test(amountDigits)
  const symbol = symbolFor(wallet.currency)

  function handleTypeChange(nextType: TransactionType) {
    setType(nextType)
    const firstOfType = sortCategoriesForDisplay(categories.filter((c) => c.type === nextType))[0]
    setCategoryId(firstOfType?.id ?? '')
  }

  function handleDateInputChange(e: ChangeEvent<HTMLInputElement>) {
    if (!e.target.value) return
    const next = toIsoDate(e.target.value)
    setCustomDate(next)
    setDatePreset(compareIsoDate(next, todayStr) === 0 ? 'today' : 'custom')
  }

  async function handleSubmit() {
    if (isZero || submitting) return
    setError(null)
    try {
      const amount = parse(amountDigits, wallet.currency).amount
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
        const category = categories.find((c) => c.id === categoryId)
        showToast(`已記錄 ${category?.name ?? '未分類'} ${formatAmountDisplay(amountDigits, symbol)}`)
      }
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-sm flex-col">
      <div className="safe-top flex items-center justify-between px-5 pt-4">
        <button type="button" onClick={() => navigate('/')} className="text-[16px] text-fg2">
          取消
        </button>
        <div className="flex rounded-[9px] bg-track p-[2px]">
          <button
            type="button"
            data-testid="type-expense"
            onClick={() => handleTypeChange('expense')}
            className={`rounded-[7px] px-4 py-1.5 text-body ${
              type === 'expense' ? 'bg-card text-fg shadow-[0_1px_3px_rgba(0,0,0,0.16)]' : 'text-fg2'
            }`}
          >
            支出
          </button>
          <button
            type="button"
            data-testid="type-income"
            onClick={() => handleTypeChange('income')}
            className={`rounded-[7px] px-4 py-1.5 text-body ${
              type === 'income' ? 'bg-card text-fg shadow-[0_1px_3px_rgba(0,0,0,0.16)]' : 'text-fg2'
            }`}
          >
            收入
          </button>
        </div>
        <span className="w-8" aria-hidden="true" />
      </div>

      <div className="flex flex-col items-center gap-1 px-5 pb-5 pt-6">
        <p className="text-[12px] tracking-[0.04em] text-fg2">
          {wallet.name} · {wallet.currency}
        </p>
        <p
          data-testid="amount-display"
          className={`text-amount-input tabular-nums ${
            isZero ? 'text-fg3' : type === 'income' ? 'text-income' : 'text-fg'
          }`}
        >
          {formatAmountDisplay(amountDigits, symbol)}
        </p>
      </div>

      <div className="px-5">
        <CategoryGrid
          categories={categories}
          type={type}
          selectedId={categoryId}
          onSelect={setCategoryId}
        />
      </div>

      <div className="flex items-center gap-2 px-5 py-4">
        <button
          type="button"
          onClick={() => setDatePreset('today')}
          className={`rounded-pill px-3 py-1.5 text-caption ${
            datePreset === 'today' ? 'bg-accent text-white' : 'bg-track text-fg2'
          }`}
        >
          今天
        </button>
        <button
          type="button"
          onClick={() => setDatePreset('yesterday')}
          className={`rounded-pill px-3 py-1.5 text-caption ${
            datePreset === 'yesterday' ? 'bg-accent text-white' : 'bg-track text-fg2'
          }`}
        >
          昨天
        </button>
        <button
          type="button"
          onClick={() => setDatePreset('custom')}
          className={`rounded-pill px-3 py-1.5 text-caption ${
            datePreset === 'custom' ? 'bg-accent text-white' : 'bg-track text-fg2'
          }`}
        >
          選日期
        </button>
        {datePreset === 'custom' && (
          <input
            type="date"
            aria-label="選擇日期"
            data-testid="transaction-date-input"
            value={customDate}
            onChange={handleDateInputChange}
            className="rounded-pill bg-track px-2 py-1 text-caption text-fg2"
          />
        )}
        <span className="flex-1" />
        {noteOpen ? (
          <input
            type="text"
            aria-label="備註"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-24 rounded-pill bg-track px-3 py-1.5 text-caption text-fg"
          />
        ) : (
          <button
            type="button"
            onClick={() => setNoteOpen(true)}
            className="rounded-pill bg-track px-3 py-1.5 text-caption text-fg2"
          >
            ＋ 備註
          </button>
        )}
      </div>

      {error && (
        <p role="alert" className="px-5 text-caption text-danger">
          {error}
        </p>
      )}

      <div className="mt-auto">
        <AmountPad
          onDigit={(digit) => setAmountDigits((current) => appendDigit(current, digit))}
          onDelete={() => setAmountDigits((current) => deleteDigit(current))}
        />
        <div className="safe-bottom px-4 pb-4 pt-3">
          <button
            type="button"
            data-testid="submit-transaction"
            disabled={isZero || submitting}
            onClick={() => void handleSubmit()}
            className="w-full rounded-[14px] bg-accent px-4 py-[15px] text-[17px] font-semibold text-white disabled:opacity-40"
          >
            {initial ? '儲存' : '記一筆'}
          </button>
        </div>
      </div>
    </div>
  )
}
