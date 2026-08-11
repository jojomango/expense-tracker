import { describe, it, expect } from 'vitest'
import {
  calculateWeeklyBalance,
  calculateWeeklyExpenseTotal,
  calculateTotalBalance,
  summarizeByCategory,
} from '../../src/domain/budget'
import type { Wallet } from '../../src/domain/wallet'
import type { Transaction } from '../../src/domain/transaction'
import { toIsoDate, type IsoDate } from '../../src/domain/iso-date'

const d = (s: string): IsoDate => toIsoDate(s)

let seq = 0
function tx(overrides: Partial<Transaction> & Pick<Transaction, 'walletId' | 'type' | 'amount' | 'date'>): Transaction {
  seq += 1
  return {
    id: `t${seq}`,
    categoryId: 'c1',
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
    ...overrides,
  }
}

// weekStart=1（週一），今天 2026-08-11（二）→ 本週 2026-08-10 ~ 2026-08-16（見 T2.1.1）
const REFERENCE_DATE = new Date(2026, 7, 11, 12, 0)
const WEEK_START = 1

describe('T3.1 — 週預算（budgetMode = weekly）', () => {
  const dailyWallet: Wallet = {
    id: 'w-daily',
    name: '日常',
    currency: 'TWD',
    budgetMode: 'weekly',
    budgetAmount: 300000,
    archived: false,
  }

  it('T3.1.1 — 無交易，餘額為 300000（NT$3,000.00）', () => {
    const result = calculateWeeklyBalance(dailyWallet, [], WEEK_START, REFERENCE_DATE)
    expect(result).toEqual({ balance: { amount: 300000, currency: 'TWD' }, isOverBudget: false })
  })

  it('T3.1.2 — 本週支出 500 + 300，餘額為 300000 - 80000 = 220000', () => {
    const transactions = [
      tx({ walletId: 'w-daily', type: 'expense', amount: 50000, date: d('2026-08-11') }),
      tx({ walletId: 'w-daily', type: 'expense', amount: 30000, date: d('2026-08-12') }),
    ]
    const result = calculateWeeklyBalance(dailyWallet, transactions, WEEK_START, REFERENCE_DATE)
    expect(result?.balance.amount).toBe(220000)
    expect(result?.isOverBudget).toBe(false)
  })

  it('T3.1.3 — 本週支出 3500，超支為 -50000，isOverBudget = true', () => {
    const transactions = [tx({ walletId: 'w-daily', type: 'expense', amount: 350000, date: d('2026-08-11') })]
    const result = calculateWeeklyBalance(dailyWallet, transactions, WEEK_START, REFERENCE_DATE)
    expect(result?.balance.amount).toBe(-50000)
    expect(result?.isOverBudget).toBe(true)
  })

  it('T3.1.4 — 本週支出 3000（剛好用完），餘額 0，isOverBudget = false（邊界：0 不算超支）', () => {
    const transactions = [tx({ walletId: 'w-daily', type: 'expense', amount: 300000, date: d('2026-08-11') })]
    const result = calculateWeeklyBalance(dailyWallet, transactions, WEEK_START, REFERENCE_DATE)
    expect(result?.balance.amount).toBe(0)
    expect(result?.isOverBudget).toBe(false)
  })

  it('T3.1.5 — 本週有一筆收入 5000，餘額不受影響（D1：只計支出）', () => {
    const transactions = [tx({ walletId: 'w-daily', type: 'income', amount: 500000, date: d('2026-08-11') })]
    const result = calculateWeeklyBalance(dailyWallet, transactions, WEEK_START, REFERENCE_DATE)
    expect(result?.balance.amount).toBe(300000)
  })

  it('T3.1.6 — 上週支出 2000，本週 0，本週餘額仍為 300000（不結轉、不累計）', () => {
    const transactions = [tx({ walletId: 'w-daily', type: 'expense', amount: 200000, date: d('2026-08-03') })]
    const result = calculateWeeklyBalance(dailyWallet, transactions, WEEK_START, REFERENCE_DATE)
    expect(result?.balance.amount).toBe(300000)
  })

  it('T3.1.7 — 交易日期為本週週首當天，計入', () => {
    const transactions = [tx({ walletId: 'w-daily', type: 'expense', amount: 10000, date: d('2026-08-10') })]
    const result = calculateWeeklyBalance(dailyWallet, transactions, WEEK_START, REFERENCE_DATE)
    expect(result?.balance.amount).toBe(290000)
  })

  it('T3.1.8 — 交易日期為本週週尾當天，計入', () => {
    const transactions = [tx({ walletId: 'w-daily', type: 'expense', amount: 10000, date: d('2026-08-16') })]
    const result = calculateWeeklyBalance(dailyWallet, transactions, WEEK_START, REFERENCE_DATE)
    expect(result?.balance.amount).toBe(290000)
  })

  it('T3.1.9 — 交易日期為週首前一天，不計入', () => {
    const transactions = [tx({ walletId: 'w-daily', type: 'expense', amount: 10000, date: d('2026-08-09') })]
    const result = calculateWeeklyBalance(dailyWallet, transactions, WEEK_START, REFERENCE_DATE)
    expect(result?.balance.amount).toBe(300000)
  })

  it('T3.1.10 — 交易日期為週尾後一天，不計入', () => {
    const transactions = [tx({ walletId: 'w-daily', type: 'expense', amount: 10000, date: d('2026-08-17') })]
    const result = calculateWeeklyBalance(dailyWallet, transactions, WEEK_START, REFERENCE_DATE)
    expect(result?.balance.amount).toBe(300000)
  })

  it('T3.1.11 — 未來日期（本週內）的交易，計入（預先記帳）', () => {
    const transactions = [tx({ walletId: 'w-daily', type: 'expense', amount: 10000, date: d('2026-08-15') })]
    const result = calculateWeeklyBalance(dailyWallet, transactions, WEEK_START, REFERENCE_DATE)
    expect(result?.balance.amount).toBe(290000)
  })

  it('T3.1.12 — 其他錢包的交易，不計入（錢包隔離）', () => {
    const transactions = [tx({ walletId: 'w-other', type: 'expense', amount: 10000, date: d('2026-08-11') })]
    const result = calculateWeeklyBalance(dailyWallet, transactions, WEEK_START, REFERENCE_DATE)
    expect(result?.balance.amount).toBe(300000)
  })
})

describe('T3.2 — 總預算（budgetMode = total）', () => {
  const travelWallet: Wallet = {
    id: 'w-travel',
    name: '日本旅遊',
    currency: 'JPY',
    budgetMode: 'total',
    budgetAmount: 200000,
    archived: false,
  }

  it('T3.2.1 — 無交易，餘額 200000，已用 0%', () => {
    const result = calculateTotalBalance(travelWallet, [])
    expect(result?.balance.amount).toBe(200000)
    expect(result?.usedPercent).toBe(0)
  })

  it('T3.2.2 — 支出 50000，餘額 150000，已用 25%', () => {
    const transactions = [tx({ walletId: 'w-travel', type: 'expense', amount: 50000, date: d('2026-08-11') })]
    const result = calculateTotalBalance(travelWallet, transactions)
    expect(result?.balance.amount).toBe(150000)
    expect(result?.usedPercent).toBe(25)
  })

  it('T3.2.3 — 支出跨越多週（3 週共 180000），餘額 20000，週界完全無關', () => {
    const transactions = [
      tx({ walletId: 'w-travel', type: 'expense', amount: 60000, date: d('2026-07-28') }),
      tx({ walletId: 'w-travel', type: 'expense', amount: 60000, date: d('2026-08-05') }),
      tx({ walletId: 'w-travel', type: 'expense', amount: 60000, date: d('2026-08-12') }),
    ]
    const result = calculateTotalBalance(travelWallet, transactions)
    expect(result?.balance.amount).toBe(20000)
  })

  it('T3.2.4 — 支出 250000，餘額 -50000，已用 125%，isOverBudget = true', () => {
    const transactions = [tx({ walletId: 'w-travel', type: 'expense', amount: 250000, date: d('2026-08-11') })]
    const result = calculateTotalBalance(travelWallet, transactions)
    expect(result?.balance.amount).toBe(-50000)
    expect(result?.usedPercent).toBe(125)
    expect(result?.isOverBudget).toBe(true)
  })

  it('T3.2.5 — 有一筆收入 30000，餘額不受影響（D1）', () => {
    const transactions = [tx({ walletId: 'w-travel', type: 'income', amount: 30000, date: d('2026-08-11') })]
    const result = calculateTotalBalance(travelWallet, transactions)
    expect(result?.balance.amount).toBe(200000)
  })

  it('T3.2.6 — 總預算為 0，已用百分比回傳 0，不得 NaN', () => {
    const zeroBudgetWallet: Wallet = { ...travelWallet, budgetAmount: 0 }
    const transactions = [tx({ walletId: 'w-travel', type: 'expense', amount: 1000, date: d('2026-08-11') })]
    const result = calculateTotalBalance(zeroBudgetWallet, transactions)
    expect(result?.usedPercent).toBe(0)
    expect(Number.isNaN(result?.usedPercent)).toBe(false)
  })
})

describe('T3.3 — 無預算（budgetMode = none）', () => {
  const noBudgetWallet: Wallet = {
    id: 'w-none',
    name: '無預算錢包',
    currency: 'TWD',
    budgetMode: 'none',
    budgetAmount: null,
    archived: false,
  }

  it('T3.3.1 — 呼叫餘額計算回傳 null（而非 0）', () => {
    expect(calculateWeeklyBalance(noBudgetWallet, [], WEEK_START, REFERENCE_DATE)).toBeNull()
    expect(calculateTotalBalance(noBudgetWallet, [])).toBeNull()
  })

  it('T3.3.2 — 呼叫本週支出總額仍正常回傳數值', () => {
    const transactions = [tx({ walletId: 'w-none', type: 'expense', amount: 12000, date: d('2026-08-11') })]
    const total = calculateWeeklyExpenseTotal(noBudgetWallet, transactions, WEEK_START, REFERENCE_DATE)
    expect(total).toEqual({ amount: 12000, currency: 'TWD' })
  })
})

describe('T3.4 — 多錢包隔離（多幣別關鍵測案）', () => {
  const dailyWallet: Wallet = {
    id: 'w-daily',
    name: '日常',
    currency: 'TWD',
    budgetMode: 'weekly',
    budgetAmount: 300000,
    archived: false,
  }
  const travelWallet: Wallet = {
    id: 'w-travel',
    name: '日本旅遊',
    currency: 'JPY',
    budgetMode: 'total',
    budgetAmount: 200000,
    archived: false,
  }
  const transactions = [
    tx({ walletId: 'w-daily', type: 'expense', amount: 50000, date: d('2026-08-11') }),
    tx({ walletId: 'w-travel', type: 'expense', amount: 8000, date: d('2026-08-11') }),
  ]

  it('T3.4.1 — 計算日常錢包餘額，只含 TWD 交易，回傳 Money(TWD)', () => {
    const result = calculateWeeklyBalance(dailyWallet, transactions, WEEK_START, REFERENCE_DATE)
    expect(result?.balance.currency).toBe('TWD')
    expect(result?.balance.amount).toBe(250000)
  })

  it('T3.4.2 — 計算旅遊錢包餘額，只含 JPY 交易，回傳 Money(JPY)', () => {
    const result = calculateTotalBalance(travelWallet, transactions)
    expect(result?.balance.currency).toBe('JPY')
    expect(result?.balance.amount).toBe(192000)
  })

  it('T3.4.4 — 兩錢包餘額計算互不影響：修改 JPY 交易後 TWD 餘額不變', () => {
    const before = calculateWeeklyBalance(dailyWallet, transactions, WEEK_START, REFERENCE_DATE)
    const modifiedTransactions: Transaction[] = transactions.map((t) =>
      t.walletId === 'w-travel' ? { ...t, amount: 99999 } : t,
    )
    const after = calculateWeeklyBalance(dailyWallet, modifiedTransactions, WEEK_START, REFERENCE_DATE)
    expect(after).toEqual(before)
  })
})

describe('T3.5 — 分類彙總', () => {
  it('T3.5.1 — 5 筆分屬 3 分類的支出，3 組，依金額倒序，含各組佔比', () => {
    const transactions = [
      tx({ walletId: 'w1', type: 'expense', amount: 5000, categoryId: 'food', date: d('2026-08-11') }),
      tx({ walletId: 'w1', type: 'expense', amount: 3000, categoryId: 'food', date: d('2026-08-12') }),
      tx({ walletId: 'w1', type: 'expense', amount: 4000, categoryId: 'transport', date: d('2026-08-11') }),
      tx({ walletId: 'w1', type: 'expense', amount: 1000, categoryId: 'transport', date: d('2026-08-12') }),
      tx({ walletId: 'w1', type: 'expense', amount: 2000, categoryId: 'shopping', date: d('2026-08-11') }),
    ]
    const result = summarizeByCategory(transactions)
    expect(result).toHaveLength(3)
    expect(result.map((r) => r.categoryId)).toEqual(['food', 'transport', 'shopping'])
    expect(result[0]).toEqual({ categoryId: 'food', type: 'expense', amount: 8000, percent: 53.33 })
    expect(result[1]).toEqual({ categoryId: 'transport', type: 'expense', amount: 5000, percent: 33.33 })
    expect(result[2]).toEqual({ categoryId: 'shopping', type: 'expense', amount: 2000, percent: 13.33 })
  })

  it('T3.5.2 — 混合收入與支出，分開彙總，不混算', () => {
    const transactions = [
      tx({ walletId: 'w1', type: 'expense', amount: 3000, categoryId: 'food', date: d('2026-08-11') }),
      tx({ walletId: 'w1', type: 'income', amount: 9000, categoryId: 'salary', date: d('2026-08-11') }),
    ]
    const result = summarizeByCategory(transactions)
    const expenseEntry = result.find((r) => r.type === 'expense')
    const incomeEntry = result.find((r) => r.type === 'income')
    expect(expenseEntry).toEqual({ categoryId: 'food', type: 'expense', amount: 3000, percent: 100 })
    expect(incomeEntry).toEqual({ categoryId: 'salary', type: 'income', amount: 9000, percent: 100 })
  })

  it('T3.5.3 — 有交易的分類被刪除，該筆歸入「未分類」，交易不遺失', () => {
    const transactions = [
      tx({ walletId: 'w1', type: 'expense', amount: 3000, categoryId: null, date: d('2026-08-11') }),
      tx({ walletId: 'w1', type: 'expense', amount: 2000, categoryId: 'food', date: d('2026-08-11') }),
    ]
    const result = summarizeByCategory(transactions)
    const uncategorized = result.find((r) => r.categoryId === null)
    expect(uncategorized).toEqual({ categoryId: null, type: 'expense', amount: 3000, percent: 60 })
  })

  it('T3.5.4 — 空清單，回傳空陣列，佔比計算不 crash', () => {
    expect(summarizeByCategory([])).toEqual([])
  })
})
