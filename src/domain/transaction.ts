/**
 * Transaction — 交易型別與驗證規則（SPEC.md §3.2）。
 *
 * 交易的幣別隱含由所屬錢包決定，不獨立儲存（D2）。
 */
import type { IsoDate } from './iso-date'

export type TransactionType = 'expense' | 'income'

export interface Transaction {
  readonly id: string
  readonly walletId: string
  readonly type: TransactionType
  /** 最小單位正整數；方向由 type 決定，amount 永遠為正（SPEC.md §3.2）。 */
  readonly amount: number
  /**
   * 所屬分類。`null` 代表「未分類」——分類被刪除後交易轉移到此，
   * 交易本身不連帶刪除（SPEC.md §3.3）。
   */
  readonly categoryId: string | null
  readonly date: IsoDate
  readonly note?: string
  readonly createdAt: string
  readonly updatedAt: string
}

/** 驗證交易欄位是否符合規則，不合法則拋 RangeError。 */
export function validateTransaction(transaction: Transaction): void {
  if (!Number.isInteger(transaction.amount) || transaction.amount <= 0) {
    throw new RangeError(`交易金額必須是正整數: ${transaction.amount}`)
  }
}
