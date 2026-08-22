import { describe, it, expect } from 'vitest'
import {
  validateCategory,
  reassignDeletedCategory,
  assertCanDeleteCategory,
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

describe('assertCanDeleteCategory — 系統預設分類不可刪除（SPEC.md §3.3，Phase 6 新增，非 TESTCASES.md 契約項目）', () => {
  it('isDefault 為 true 時拋出 DefaultCategoryError', () => {
    expect(() => assertCanDeleteCategory({ ...baseCategory, isDefault: true })).toThrow(
      DefaultCategoryError,
    )
  })

  it('isDefault 為 false 時不拋錯', () => {
    expect(() => assertCanDeleteCategory({ ...baseCategory, isDefault: false })).not.toThrow()
  })
})
