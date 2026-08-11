import { describe, it, expect } from 'vitest'
import {
  validateCategory,
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
