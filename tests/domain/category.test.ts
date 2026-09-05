import { describe, it, expect } from 'vitest'
import {
  validateCategory,
  reassignDeletedCategory,
  assertCanDeleteCategory,
  sortCategoriesForDisplay,
  DefaultCategoryError,
  DEFAULT_EXPENSE_CATEGORIES,
  DEFAULT_INCOME_CATEGORIES,
  type Category,
} from '../../src/domain/category'

const baseCategory: Category = {
  id: 'c1',
  name: '飲食',
  type: 'expense',
  icon: '🍜',
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

describe('sortCategoriesForDisplay（Phase 9 新增，非 TESTCASES.md 契約項目）', () => {
  // 起因：CategoryGrid（記帳頁分類網格）改用 store 內的 categories 陣列直接渲染後，
  // 才發現 Dexie 的 list() 回傳順序等同資料庫內部主鍵（UUID）順序，跟 DEFAULT_CATEGORIES
  // 宣告的順序無關——每次「首次啟動」重新 seed 時，網格格子的視覺順序都不一樣，
  // 使用者無法靠位置記憶分類在哪一格。這裡補一個純函式把預設分類排回宣告順序。
  const shuffled: Category[] = [
    { id: 'c-other', name: '其他', type: 'expense', icon: '📦', isDefault: true },
    { id: 'c-custom', name: '咖啡', type: 'expense', icon: '☕', isDefault: false },
    { id: 'c-food', name: '飲食', type: 'expense', icon: '🍜', isDefault: true },
    { id: 'c-transport', name: '交通', type: 'expense', icon: '🚗', isDefault: true },
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
