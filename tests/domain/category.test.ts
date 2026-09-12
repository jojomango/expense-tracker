import { describe, it, expect } from 'vitest'
import {
  validateCategory,
  reassignDeletedCategory,
  assertCanDeleteCategory,
  sortCategoriesForDisplay,
  seedColorFor,
  DefaultCategoryError,
  DEFAULT_CATEGORIES,
  DEFAULT_EXPENSE_CATEGORIES,
  DEFAULT_INCOME_CATEGORIES,
  FALLBACK_CATEGORY_COLOR,
  type Category,
} from '../../src/domain/category'

const baseCategory: Category = {
  id: 'c1',
  name: '飲食',
  type: 'expense',
  icon: '🍜',
  color: '#c1502e',
  isDefault: true,
}

describe('Category — 型別與驗證規則', () => {
  it('欄位齊全時合法', () => {
    expect(() => validateCategory(baseCategory)).not.toThrow()
  })

  it('名稱為空字串時拋錯', () => {
    expect(() => validateCategory({ ...baseCategory, name: '' })).toThrow(RangeError)
  })

  it('icon 為空字串時拋錯', () => {
    expect(() => validateCategory({ ...baseCategory, icon: '' })).toThrow(RangeError)
  })

  it('預設支出分類共 7 個（SPEC.md §3.3）', () => {
    expect(DEFAULT_EXPENSE_CATEGORIES).toHaveLength(7)
    expect(DEFAULT_EXPENSE_CATEGORIES.every((c) => c.type === 'expense')).toBe(true)
  })

  it('預設收入分類共 4 個（SPEC.md §3.3）', () => {
    expect(DEFAULT_INCOME_CATEGORIES).toHaveLength(4)
    expect(DEFAULT_INCOME_CATEGORIES.every((c) => c.type === 'income')).toBe(true)
  })
})

describe('reassignDeletedCategory — 分類刪除後交易轉移到未分類（SPEC.md §3.3，支援 T3.5.3）', () => {
  it('引用被刪除分類的交易，categoryId 改為 null', () => {
    const transactions = [
      { id: 't1', categoryId: 'c1' },
      { id: 't2', categoryId: 'c2' },
    ]
    const result = reassignDeletedCategory(transactions, 'c1')
    expect(result).toEqual([
      { id: 't1', categoryId: null },
      { id: 't2', categoryId: 'c2' },
    ])
  })

  it('交易本身不會被刪除（陣列長度不變）', () => {
    const transactions = [{ id: 't1', categoryId: 'c1' }]
    expect(reassignDeletedCategory(transactions, 'c1')).toHaveLength(1)
  })

  it('空清單回傳空陣列，不拋錯', () => {
    expect(reassignDeletedCategory([], 'c1')).toEqual([])
  })

  it('沒有交易引用該分類時，全部交易維持不變', () => {
    const transactions = [{ id: 't1', categoryId: 'c2' }]
    expect(reassignDeletedCategory(transactions, 'c1')).toEqual(transactions)
  })
})

describe('T6.1 — 分類刪除規則（assertCanDeleteCategory，Phase 6 新增）', () => {
  it('T6.1.1 — isDefault 為 true 時拋出 DefaultCategoryError', () => {
    expect(() => assertCanDeleteCategory({ ...baseCategory, isDefault: true })).toThrow(
      DefaultCategoryError,
    )
  })

  it('T6.1.2 — isDefault 為 false 時不拋錯', () => {
    expect(() => assertCanDeleteCategory({ ...baseCategory, isDefault: false })).not.toThrow()
  })
})

describe('T7.5 — 分類色驗證（Phase 10 新增）', () => {
  it('T7.5.1 — color: #c1502e 通過', () => {
    expect(() => validateCategory({ ...baseCategory, color: '#c1502e' })).not.toThrow()
  })

  it('T7.5.2 — color 為空字串時拋 RangeError', () => {
    expect(() => validateCategory({ ...baseCategory, color: '' })).toThrow(RangeError)
  })

  it('T7.5.3 — color: red（非 #rrggbb）拋 RangeError', () => {
    expect(() => validateCategory({ ...baseCategory, color: 'red' })).toThrow(RangeError)
  })

  it('T7.5.4 — color: #FFF（三位縮寫）拋 RangeError', () => {
    expect(() => validateCategory({ ...baseCategory, color: '#FFF' })).toThrow(RangeError)
  })

  it('T7.5.5 — 11 個預設分類種子皆有 color，且與 UI-SPEC.md §2.2 表格完全一致', () => {
    expect(DEFAULT_CATEGORIES).toHaveLength(11)
    const expected: Record<string, string> = {
      'expense:飲食': '#c1502e',
      'expense:交通': '#3f8f6a',
      'expense:居住': '#a8792f',
      'expense:購物': '#2f6f9f',
      'expense:娛樂': '#8a5fbf',
      'expense:醫療': '#c04a6e',
      'expense:其他': '#7a7a80',
      'income:薪資': '#2f8f63',
      'income:獎金': '#c98b2e',
      'income:投資': '#4a6fa8',
      'income:其他': '#7a7a80',
    }
    for (const seed of DEFAULT_CATEGORIES) {
      expect(seed.color).toBe(expected[`${seed.type}:${seed.name}`])
    }
  })
})

describe('seedColorFor（Phase 10 新增，供 migration／backup 共用）', () => {
  it('找得到對應的預設種子時回傳其 color', () => {
    expect(seedColorFor('飲食', 'expense')).toBe('#c1502e')
    expect(seedColorFor('薪資', 'income')).toBe('#2f8f63')
  })

  it('找不到（使用者自建分類）時回傳 fallback 色', () => {
    expect(seedColorFor('寵物', 'expense')).toBe(FALLBACK_CATEGORY_COLOR)
  })

  it('name 相同但 type 不同時視為不同分類，不誤配對到色', () => {
    // 「其他」同時存在於 expense 與 income，兩者剛好都是 fallback 色，
    // 這裡改用「飲食」（只存在於 expense）驗證 type 有被納入比對。
    expect(seedColorFor('飲食', 'income')).toBe(FALLBACK_CATEGORY_COLOR)
  })
})

describe('sortCategoriesForDisplay（Phase 9 新增，非 TESTCASES.md 契約項目）', () => {
  // 起因：CategoryGrid（記帳頁分類網格）改用 store 內的 categories 陣列直接渲染後，
  // 才發現 Dexie 的 list() 回傳順序等同資料庫內部主鍵（UUID）順序，跟 DEFAULT_CATEGORIES
  // 宣告的順序無關——每次「首次啟動」重新 seed 時，網格格子的視覺順序都不一樣，
  // 使用者無法靠位置記憶分類在哪一格。這裡補一個純函式把預設分類排回宣告順序。
  const shuffled: Category[] = [
    { id: 'c-other', name: '其他', type: 'expense', icon: '📦', color: '#7a7a80', isDefault: true },
    { id: 'c-custom', name: '咖啡', type: 'expense', icon: '☕', color: '#7a7a80', isDefault: false },
    { id: 'c-food', name: '飲食', type: 'expense', icon: '🍜', color: '#c1502e', isDefault: true },
    { id: 'c-transport', name: '交通', type: 'expense', icon: '🚗', color: '#3f8f6a', isDefault: true },
  ]

  it('預設分類回到 DEFAULT_CATEGORIES 的宣告順序，非預設分類排在所有預設分類之後', () => {
    const result = sortCategoriesForDisplay(shuffled)
    expect(result.map((c) => c.name)).toEqual(['飲食', '交通', '其他', '咖啡'])
  })

  it('空清單回傳空陣列，不拋錯', () => {
    expect(sortCategoriesForDisplay([])).toEqual([])
  })

  it('不修改原陣列（回傳新陣列）', () => {
    const original = [...shuffled]
    sortCategoriesForDisplay(shuffled)
    expect(shuffled).toEqual(original)
  })
})
