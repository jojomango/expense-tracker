/**
 * Budget — 預算與餘額計算（SPEC.md §3.4）。
 *
 * D1：週餘額與總餘額只計算 expense，不扣除 income。
 * 所有函式都是純函式，錢包隔離（不跨錢包加總，也不做幣別換算）
 * 由「只處理傳入 wallet.id 對應的交易」自然達成，不需要呼叫端事先過濾。
 */
import { Money, subtract, sum, percentOf, type Money as MoneyType } from './money'
import { weekRangeOf, shiftIsoDate, type WeekStartDay } from './week'
import { todayIso, compareIsoDate, type IsoDate } from './iso-date'
import type { Wallet } from './wallet'
import type { Transaction, TransactionType } from './transaction'

export interface WeeklyBalanceResult {
  readonly balance: MoneyType
  readonly isOverBudget: boolean
}

export interface TotalBalanceResult {
  readonly balance: MoneyType
  readonly isOverBudget: boolean
  readonly usedPercent: number
}

export interface CategorySummaryEntry {
  readonly categoryId: string | null
  readonly type: TransactionType
  /** 最小單位整數；呼叫端必須保證傳入的交易屬於同一幣別（同一錢包）。 */
  readonly amount: number
  /** 佔同 type 加總的百分比（0～100，四捨五入至小數 2 位）。 */
  readonly percent: number
}

function walletExpenses(wallet: Wallet, transactions: readonly Transaction[]): Transaction[] {
  return transactions.filter((t) => t.walletId === wallet.id && t.type === 'expense')
}

/** 該錢包本週支出總額，與 budgetMode 無關（T3.3.2：none 模式仍可查詢）。 */
export function calculateWeeklyExpenseTotal(
  wallet: Wallet,
  transactions: readonly Transaction[],
  weekStartDay: WeekStartDay,
  referenceDate: Date,
): MoneyType {
  const { start, end } = weekRangeOf(todayIso(referenceDate), weekStartDay)
  const inWeek = walletExpenses(wallet, transactions).filter(
    (t) => compareIsoDate(t.date, start) >= 0 && compareIsoDate(t.date, end) <= 0,
  )
  return sum(
    inWeek.map((t) => Money.of(t.amount, wallet.currency)),
    wallet.currency,
  )
}

/**
 * 週預算餘額 = 週預算 − 本週支出總和（SPEC.md §3.4）。
 * budgetMode 不是 'weekly' 時回傳 null（T3.3.1）。
 */
export function calculateWeeklyBalance(
  wallet: Wallet,
  transactions: readonly Transaction[],
  weekStartDay: WeekStartDay,
  referenceDate: Date,
): WeeklyBalanceResult | null {
  if (wallet.budgetMode !== 'weekly' || wallet.budgetAmount === null) {
    return null
  }
  const spent = calculateWeeklyExpenseTotal(wallet, transactions, weekStartDay, referenceDate)
  const budget = Money.of(wallet.budgetAmount, wallet.currency)
  const balance = subtract(budget, spent)
  return { balance, isOverBudget: balance.amount < 0 }
}

/**
 * 總預算餘額 = 總預算 − 該錢包全部支出總和，不受週期影響（SPEC.md §3.4）。
 * budgetMode 不是 'total' 時回傳 null（T3.3.1）。
 */
export function calculateTotalBalance(
  wallet: Wallet,
  transactions: readonly Transaction[],
): TotalBalanceResult | null {
  if (wallet.budgetMode !== 'total' || wallet.budgetAmount === null) {
    return null
  }
  const spent = sum(
    walletExpenses(wallet, transactions).map((t) => Money.of(t.amount, wallet.currency)),
    wallet.currency,
  )
  const budget = Money.of(wallet.budgetAmount, wallet.currency)
  const balance = subtract(budget, spent)
  return { balance, isOverBudget: balance.amount < 0, usedPercent: percentOf(spent, budget) }
}

export interface WeeklyTrendEntry {
  readonly start: IsoDate
  readonly end: IsoDate
  /** 該週支出總額（只計 expense，沿用 D1 精神）。 */
  readonly total: MoneyType
}

/**
 * 近 `weeksCount` 週的支出趨勢（Phase 6：近 8 週趨勢圖），依週首由舊到新排序，
 * 最後一筆為本週。與 budgetMode 無關（none 模式的錢包也能查）。
 */
export function summarizeWeeklyTrend(
  wallet: Wallet,
  transactions: readonly Transaction[],
  weekStartDay: WeekStartDay,
  referenceDate: Date,
  weeksCount: number,
): WeeklyTrendEntry[] {
  if (weeksCount <= 0) return []

  const currentWeekStart = weekRangeOf(todayIso(referenceDate), weekStartDay).start
  const expenses = walletExpenses(wallet, transactions)
  const entries: WeeklyTrendEntry[] = []

  for (let i = weeksCount - 1; i >= 0; i--) {
    const anchor = shiftIsoDate(currentWeekStart, -7 * i)
    const { start, end } = weekRangeOf(anchor, weekStartDay)
    const inWeek = expenses.filter(
      (t) => compareIsoDate(t.date, start) >= 0 && compareIsoDate(t.date, end) <= 0,
    )
    const total = sum(
      inWeek.map((t) => Money.of(t.amount, wallet.currency)),
      wallet.currency,
    )
    entries.push({ start, end, total })
  }

  return entries
}

/**
 * 依分類彙總交易金額，收入與支出分開統計（T3.5.2），
 * `categoryId = null` 代表分類已被刪除、交易歸入「未分類」（T3.5.3）。
 *
 * 假設呼叫端傳入的交易屬於同一幣別（例如同一錢包），
 * 因此金額以最小單位整數加總，不經過 Money（Money 禁止跨幣運算）。
 */
export function summarizeByCategory(transactions: readonly Transaction[]): CategorySummaryEntry[] {
  const totalsByType = new Map<TransactionType, number>()
  const grouped = new Map<string, { categoryId: string | null; type: TransactionType; amount: number }>()

  for (const t of transactions) {
    const key = `${t.type}:${t.categoryId ?? ''}`
    const entry = grouped.get(key)
    if (entry) {
      entry.amount += t.amount
    } else {
      grouped.set(key, { categoryId: t.categoryId, type: t.type, amount: t.amount })
    }
    totalsByType.set(t.type, (totalsByType.get(t.type) ?? 0) + t.amount)
  }

  return [...grouped.values()]
    .map((g) => {
      const typeTotal = totalsByType.get(g.type) ?? 0
      const percent = typeTotal === 0 ? 0 : Math.round((g.amount / typeTotal) * 100 * 100) / 100
      return { categoryId: g.categoryId, type: g.type, amount: g.amount, percent }
    })
    .sort((a, b) => b.amount - a.amount)
}
