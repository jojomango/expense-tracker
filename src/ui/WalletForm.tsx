import { useState, type FormEvent } from 'react'
import { KNOWN_CURRENCIES, type CurrencyCode } from '../domain/currency'
import type { BudgetMode, Wallet } from '../domain/wallet'
import { parse } from '../domain/money'

const BUDGET_MODE_LABELS: Record<BudgetMode, string> = {
  none: '不設預算',
  weekly: '每週',
  total: '總預算',
}

export interface WalletFormValues {
  name: string
  currency: CurrencyCode
  budgetMode: BudgetMode
  budgetAmount: number | null
}

interface WalletFormProps {
  heading: string
  submitLabel: string
  initial?: Wallet
  /** 建立後幣別不可修改（SPEC.md §7 D3），編輯既有錢包時鎖住幣別欄位。 */
  lockCurrency?: boolean
  onSubmit: (values: WalletFormValues) => Promise<void>
}

export default function WalletForm({
  heading,
  submitLabel,
  initial,
  lockCurrency = false,
  onSubmit,
}: WalletFormProps) {
  const [name, setName] = useState(initial?.name ?? '')
  const [currency, setCurrency] = useState<CurrencyCode>(initial?.currency ?? 'TWD')
  const [budgetMode, setBudgetMode] = useState<BudgetMode>(initial?.budgetMode ?? 'weekly')
  const [budgetAmountInput, setBudgetAmountInput] = useState(
    initial?.budgetAmount !== null && initial?.budgetAmount !== undefined
      ? String(initial.budgetAmount / 10 ** (currency === 'JPY' ? 0 : 2))
      : '',
  )
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      const budgetAmount =
        budgetMode === 'none' ? null : parse(budgetAmountInput || '0', currency).amount
      setSubmitting(true)
      await onSubmit({ name: name.trim(), currency, budgetMode, budgetAmount })
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-sm space-y-4 p-6">
      <h1 className="text-xl font-semibold">{heading}</h1>

      <div>
        <label htmlFor="wallet-name" className="block text-sm font-medium">
          錢包名稱
        </label>
        <input
          id="wallet-name"
          className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>

      <div>
        <label htmlFor="wallet-currency" className="block text-sm font-medium">
          幣別
        </label>
        <select
          id="wallet-currency"
          className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          value={currency}
          disabled={lockCurrency}
          onChange={(e) => setCurrency(e.target.value)}
        >
          {KNOWN_CURRENCIES.map((code) => (
            <option key={code} value={code}>
              {code}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="wallet-budget-mode" className="block text-sm font-medium">
          預算模式
        </label>
        <select
          id="wallet-budget-mode"
          className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          value={budgetMode}
          onChange={(e) => setBudgetMode(e.target.value as BudgetMode)}
        >
          {(Object.keys(BUDGET_MODE_LABELS) as BudgetMode[]).map((mode) => (
            <option key={mode} value={mode}>
              {BUDGET_MODE_LABELS[mode]}
            </option>
          ))}
        </select>
      </div>

      {budgetMode !== 'none' && (
        <div>
          <label htmlFor="wallet-budget-amount" className="block text-sm font-medium">
            預算金額
          </label>
          <input
            id="wallet-budget-amount"
            inputMode="decimal"
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
            value={budgetAmountInput}
            onChange={(e) => setBudgetAmountInput(e.target.value)}
            required
          />
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
      >
        {submitLabel}
      </button>
    </form>
  )
}
