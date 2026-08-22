/**
 * Category — 分類型別與預設分類種子資料（SPEC.md §3.3）。
 *
 * 分類全域共用，不隸屬於特定錢包（D5）。
 */
export type CategoryType = 'expense' | 'income'

export interface Category {
  readonly id: string
  readonly name: string
  readonly type: CategoryType
  /** v1 用 emoji 字串，不做圖檔。 */
  readonly icon: string
  /** 系統預設分類，可改名但不可刪除。 */
  readonly isDefault: boolean
}

/** 驗證分類欄位是否符合規則，不合法則拋 RangeError。 */
export function validateCategory(category: Category): void {
  if (category.name.trim() === '') {
    throw new RangeError('分類名稱不可為空')
  }
  if (category.icon.trim() === '') {
    throw new RangeError('分類 icon 不可為空')
  }
}

export interface DefaultCategorySeed {
  readonly name: string
  readonly type: CategoryType
  readonly icon: string
}

/**
 * 首次啟動建立的預設分類種子（SPEC.md §3.3）。
 * 不含 `id`——由 persistence 層在寫入時產生。
 */
export const DEFAULT_EXPENSE_CATEGORIES: readonly DefaultCategorySeed[] = [
  { name: '飲食', type: 'expense', icon: '🍜' },
  { name: '交通', type: 'expense', icon: '🚗' },
  { name: '居住', type: 'expense', icon: '🏠' },
  { name: '購物', type: 'expense', icon: '🛒' },
  { name: '娛樂', type: 'expense', icon: '🎬' },
  { name: '醫療', type: 'expense', icon: '💊' },
  { name: '其他', type: 'expense', icon: '📦' },
]

export const DEFAULT_INCOME_CATEGORIES: readonly DefaultCategorySeed[] = [
  { name: '薪資', type: 'income', icon: '💰' },
  { name: '獎金', type: 'income', icon: '🎁' },
  { name: '投資', type: 'income', icon: '📈' },
  { name: '其他', type: 'income', icon: '📦' },
]

export const DEFAULT_CATEGORIES: readonly DefaultCategorySeed[] = [
  ...DEFAULT_EXPENSE_CATEGORIES,
  ...DEFAULT_INCOME_CATEGORIES,
]

/**
 * 分類被刪除時，把引用該分類的交易 `categoryId` 改為 `null`（未分類），
 * 交易本身不連帶刪除（SPEC.md §3.3）。
 *
 * 泛型只要求 `categoryId` 欄位，刻意不 import `Transaction`型別——
 * 避免 `category.ts` 反過來依賴 `transaction.ts`，維持 domain 內部模組間的單向依賴。
 */
export function reassignDeletedCategory<T extends { categoryId: string | null }>(
  transactions: readonly T[],
  deletedCategoryId: string,
): T[] {
  return transactions.map((t) =>
    t.categoryId === deletedCategoryId ? { ...t, categoryId: null } : t,
  )
}

/** 刪除系統預設分類時拋出（SPEC.md §3.3：預設分類可改名但不可刪除）。 */
export class DefaultCategoryError extends Error {
  constructor() {
    super('系統預設分類不可刪除')
    this.name = 'DefaultCategoryError'
  }
}

/** 刪除分類前的業務規則檢查，讓 persistence 層在真正執行刪除前呼叫。 */
export function assertCanDeleteCategory(category: Category): void {
  if (category.isDefault) {
    throw new DefaultCategoryError()
  }
}
