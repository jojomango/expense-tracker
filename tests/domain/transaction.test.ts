import { describe, it, expect } from 'vitest'
import { validateTransaction, type Transaction } from '../../src/domain/transaction'
import { toIsoDate } from '../../src/domain/iso-date'

const baseTransaction: Transaction = {
  id: 't1',
  walletId: 'w1',
  type: 'expense',
  amount: 100,
  categoryId: 'c1',
  date: toIsoDate('2026-08-11'),
  createdAt: '2026-08-11T00:00:00.000Z',
  updatedAt: '2026-08-11T00:00:00.000Z',
}

describe('Transaction — 型別與驗證規則', () => {
  it('amount 為正整數時合法', () => {
    expect(() => validateTransaction(baseTransaction)).not.toThrow()
  })

  it('amount 為 0 時拋錯（SPEC.md §3.2：金額必須 > 0）', () => {
    expect(() => validateTransaction({ ...baseTransaction, amount: 0 })).toThrow(RangeError)
  })

  it('amount 為負數時拋錯', () => {
    expect(() => validateTransaction({ ...baseTransaction, amount: -100 })).toThrow(RangeError)
  })

  it('amount 非整數時拋錯', () => {
    expect(() => validateTransaction({ ...baseTransaction, amount: 1.5 })).toThrow(RangeError)
  })

  it('categoryId 為 null（未分類）時仍合法', () => {
    expect(() => validateTransaction({ ...baseTransaction, categoryId: null })).not.toThrow()
  })
})
