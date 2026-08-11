import { describe, it, expect } from 'vitest'
import { validateWallet, type Wallet } from '../../src/domain/wallet'

const baseWallet: Wallet = {
  id: 'w1',
  name: '日常',
  currency: 'TWD',
  budgetMode: 'none',
  budgetAmount: null,
  archived: false,
}

describe('Wallet — 型別與驗證規則', () => {
  it('budgetMode = none 且 budgetAmount = null 時合法', () => {
    expect(() => validateWallet(baseWallet)).not.toThrow()
  })

  it('budgetMode = none 但 budgetAmount 不是 null 時拋錯', () => {
    expect(() =>
      validateWallet({ ...baseWallet, budgetMode: 'none', budgetAmount: 100 }),
    ).toThrow(RangeError)
  })

  it('budgetMode = weekly 且 budgetAmount 為非負整數時合法', () => {
    expect(() =>
      validateWallet({ ...baseWallet, budgetMode: 'weekly', budgetAmount: 300000 }),
    ).not.toThrow()
  })

  it('budgetMode = weekly 但 budgetAmount 為 null 時拋錯', () => {
    expect(() =>
      validateWallet({ ...baseWallet, budgetMode: 'weekly', budgetAmount: null }),
    ).toThrow(RangeError)
  })

  it('budgetMode = total 但 budgetAmount 為負數時拋錯', () => {
    expect(() =>
      validateWallet({ ...baseWallet, budgetMode: 'total', budgetAmount: -1 }),
    ).toThrow(RangeError)
  })

  it('budgetMode = total 但 budgetAmount 非整數時拋錯', () => {
    expect(() =>
      validateWallet({ ...baseWallet, budgetMode: 'total', budgetAmount: 1.5 }),
    ).toThrow(RangeError)
  })

  it('名稱為空字串時拋錯', () => {
    expect(() => validateWallet({ ...baseWallet, name: '  ' })).toThrow(RangeError)
  })
})
