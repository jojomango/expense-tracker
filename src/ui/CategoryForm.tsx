import { useState, type FormEvent } from 'react'
import type { Category, CategoryType } from '../domain/category'
import { FALLBACK_CATEGORY_COLOR } from '../domain/category'
import BackLink from './BackLink'

export interface CategoryFormValues {
  name: string
  type: CategoryType
  icon: string
  color: string
}

/**
 * UI-SPEC.md §2.2 的分類固定色色票。表格列出 11 個分類、共用 10 個不重複色值
 * （支出／收入的「其他」都是 fallback 色 `#7a7a80`）——色票只需要呈現不重複的
 * 顏色供使用者選,重複列出同一個色看起來會像同一顆按鈕壞掉,所以這裡去重。
 * 刻意不做自由選色（MIGRATION-category-color.md「刻意不做」）。
 */
export const CATEGORY_COLOR_SWATCHES: readonly string[] = [
  '#c1502e',
  '#3f8f6a',
  '#a8792f',
  '#2f6f9f',
  '#8a5fbf',
  '#c04a6e',
  FALLBACK_CATEGORY_COLOR,
  '#2f8f63',
  '#c98b2e',
  '#4a6fa8',
]

interface CategoryFormProps {
  heading: string
  submitLabel: string
  initial?: Category
  /** 編輯既有分類時鎖住類型欄位，避免既有交易的分類篩選邏輯錯亂。 */
  lockType?: boolean
  backTo?: string
  onSubmit: (values: CategoryFormValues) => Promise<void>
}

export default function CategoryForm({
  heading,
  submitLabel,
  initial,
  lockType = false,
  backTo,
  onSubmit,
}: CategoryFormProps) {
  const [name, setName] = useState(initial?.name ?? '')
  const [type, setType] = useState<CategoryType>(initial?.type ?? 'expense')
  const [icon, setIcon] = useState(initial?.icon ?? '')
  const [color, setColor] = useState(initial?.color ?? CATEGORY_COLOR_SWATCHES[0]!)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      setSubmitting(true)
      await onSubmit({ name: name.trim(), type, icon: icon.trim(), color })
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-sm space-y-4 p-6">
      {backTo && <BackLink to={backTo} />}
      <h1 className="text-xl font-semibold">{heading}</h1>

      <div>
        <label htmlFor="category-name" className="block text-sm font-medium">
          分類名稱
        </label>
        <input
          id="category-name"
          className="mt-1 w-full rounded border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-800"
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
          className="mt-1 w-full rounded border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-800"
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

      <div>
        <p className="block text-sm font-medium">顏色</p>
        <div className="mt-1 flex flex-wrap gap-2">
          {CATEGORY_COLOR_SWATCHES.map((swatch) => {
            const selected = swatch === color
            return (
              <button
                key={swatch}
                type="button"
                data-testid="category-color-swatch"
                data-color={swatch}
                aria-pressed={selected}
                aria-label={`顏色 ${swatch}`}
                onClick={() => setColor(swatch)}
                // 按鈕本身撐到 44×44 的可點區域（UI-SPEC.md §1.2），視覺色圈用內層
                // 較小的 span 呈現，避免每顆色票都畫成過大的色塊。
                className="flex h-11 w-11 shrink-0 items-center justify-center"
              >
                <span
                  aria-hidden="true"
                  className={`h-[30px] w-[30px] rounded-full ${selected ? 'ring-2 ring-offset-2 ring-fg' : ''}`}
                  style={{ backgroundColor: swatch }}
                />
              </button>
            )
          })}
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
