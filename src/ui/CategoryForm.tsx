import { useState, type FormEvent } from 'react'
import type { Category, CategoryType } from '../domain/category'

export interface CategoryFormValues {
  name: string
  type: CategoryType
  icon: string
}

interface CategoryFormProps {
  heading: string
  submitLabel: string
  initial?: Category
  /** 編輯既有分類時鎖住類型欄位，避免既有交易的分類篩選邏輯錯亂。 */
  lockType?: boolean
  onSubmit: (values: CategoryFormValues) => Promise<void>
}

export default function CategoryForm({
  heading,
  submitLabel,
  initial,
  lockType = false,
  onSubmit,
}: CategoryFormProps) {
  const [name, setName] = useState(initial?.name ?? '')
  const [type, setType] = useState<CategoryType>(initial?.type ?? 'expense')
  const [icon, setIcon] = useState(initial?.icon ?? '')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      setSubmitting(true)
      await onSubmit({ name: name.trim(), type, icon: icon.trim() })
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
        <label htmlFor="category-name" className="block text-sm font-medium">
          分類名稱
        </label>
        <input
          id="category-name"
          className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>

      <div>
        <label htmlFor="category-icon" className="block text-sm font-medium">
          Icon（emoji）
        </label>
        <input
          id="category-icon"
          className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          value={icon}
          onChange={(e) => setIcon(e.target.value)}
          required
        />
      </div>

      <div>
        <p className="block text-sm font-medium">類型</p>
        <div className="mt-1 flex gap-2">
          <button
            type="button"
            data-testid="category-type-expense"
            disabled={lockType}
            onClick={() => setType('expense')}
            className={`flex-1 rounded px-3 py-2 disabled:opacity-50 ${
              type === 'expense' ? 'bg-slate-900 text-white' : 'bg-slate-100'
            }`}
          >
            支出
          </button>
          <button
            type="button"
            data-testid="category-type-income"
            disabled={lockType}
            onClick={() => setType('income')}
            className={`flex-1 rounded px-3 py-2 disabled:opacity-50 ${
              type === 'income' ? 'bg-slate-900 text-white' : 'bg-slate-100'
            }`}
          >
            收入
          </button>
        </div>
      </div>

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
