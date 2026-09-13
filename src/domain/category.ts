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
  /** `#rrggbb`。分類的固定色，圖表與列表共用（UI-SPEC.md §2.2）。 */
  readonly color: string
  /** 系統預設分類，可改名但不可刪除。 */
  readonly isDefault: boolean
}

/** 使用者自建分類、或舊資料補色時的 fallback（UI-SPEC.md §2.2：未分類固定用這個色）。 */
export const FALLBACK_CATEGORY_COLOR = '#7a7a80'

const HEX_COLOR_RE = /^#[0-9a-f]{6}$/i

/** 驗證分類欄位是否符合規則，不合法則拋 RangeError。 */
export function validateCategory(category: Category): void {
  if (category.name.trim() === '') {
    throw new RangeError('分類名稱不可為空')
  }
  if (category.icon.trim() === '') {
    throw new RangeError('分類 icon 不可為空')
  }
  if (!HEX_COLOR_RE.test(category.color)) {
    throw new RangeError('分類顏色必須是 #rrggbb 格式')
  }
}

export interface DefaultCategorySeed {
  readonly name: string
  readonly type: CategoryType
  readonly icon: string
  readonly color: string
}

/**
 * 首次啟動建立的預設分類種子（SPEC.md §3.3，色值見 UI-SPEC.md §2.2）。
 * 不含 `id`——由 persistence 層在寫入時產生。
 */
export const DEFAULT_EXPENSE_CATEGORIES: readonly DefaultCategorySeed[] = [
  { name: '飲食', type: 'expense', icon: '🍜', color: '#c1502e' },
  { name: '交通', type: 'expense', icon: '🚗', color: '#3f8f6a' },
  { name: '居住', type: 'expense', icon: '🏠', color: '#a8792f' },
  { name: '購物', type: 'expense', icon: '🛒', color: '#2f6f9f' },
  { name: '娛樂', type: 'expense', icon: '🎬', color: '#8a5fbf' },
  { name: '醫療', type: 'expense', icon: '💊', color: '#c04a6e' },
  { name: '其他', type: 'expense', icon: '📦', color: FALLBACK_CATEGORY_COLOR },
]

export const DEFAULT_INCOME_CATEGORIES: readonly DefaultCategorySeed[] = [
  { name: '薪資', type: 'income', icon: '💰', color: '#2f8f63' },
  { name: '獎金', type: 'income', icon: '🎁', color: '#c98b2e' },
  { name: '投資', type: 'income', icon: '📈', color: '#4a6fa8' },
  { name: '其他', type: 'income', icon: '📦', color: FALLBACK_CATEGORY_COLOR },
]

export const DEFAULT_CATEGORIES: readonly DefaultCategorySeed[] = [
  ...DEFAULT_EXPENSE_CATEGORIES,
  ...DEFAULT_INCOME_CATEGORIES,
]

/**
 * 依名稱 + type 找出預設種子色；找不到（使用者自建分類）就回 fallback 色
 * （UI-SPEC.md §2.2）。給 Dexie v1→v2 migration 與舊備份匯入補色共用。
 */
export function seedColorFor(name: string, type: CategoryType): string {
  const seed = DEFAULT_CATEGORIES.find((c) => c.name === name && c.type === type)
  return seed?.color ?? FALLBACK_CATEGORY_COLOR
}

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

const DEFAULT_ORDER = new Map(DEFAULT_CATEGORIES.map((c, i) => [`${c.type}:${c.name}`, i]))

/**
 * 依 `DEFAULT_CATEGORIES` 的宣告順序排序，讓分類網格（Phase 9 記帳頁）有穩定、
 * 符合直覺的視覺順序，而不是資料庫回傳的任意順序（persistence 層的 `list()`
 * 等同依內部主鍵排序，跟 UUID 產生順序有關，並非使用者能理解的順序）。
 * 非預設（使用者自建）分類一律排在同 type 的預設分類之後，彼此依名稱排序。
 */
export function sortCategoriesForDisplay(categories: readonly Category[]): Category[] {
  return [...categories].sort((a, b) => {
    const orderA = DEFAULT_ORDER.get(`${a.type}:${a.name}`)
    const orderB = DEFAULT_ORDER.get(`${b.type}:${b.name}`)
    if (orderA !== undefined && orderB !== undefined) return orderA - orderB
    if (orderA !== undefined) return -1
    if (orderB !== undefined) return 1
    return a.name.localeCompare(b.name)
  })
}
