import { describe, it, expect } from 'vitest'
import {
  validateWallet,
  assertCanDeleteWallet,
  LastWalletError,
  type Wallet,
} from '../../src/domain/wallet'

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

describe('assertCanDeleteWallet — 刪除錢包前的規則檢查（SPEC.md §3.1，支援 T4.1.3）', () => {
  it('刪除前只剩 1 個錢包時拋出 LastWalletError', () => {
    expect(() => assertCanDeleteWallet(1)).toThrow(LastWalletError)
  })

  it('刪除前有 0 個錢包（不應發生，但仍視為不可刪除）時拋錯', () => {
    expect(() => assertCanDeleteWallet(0)).toThrow(LastWalletError)
  })

  it('刪除前有 2 個以上錢包時不拋錯', () => {
    expect(() => assertCanDeleteWallet(2)).not.toThrow()
  })
})
