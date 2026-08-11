/**
 * Wallet — 錢包型別與驗證規則（SPEC.md §3.1）。
 *
 * 幣別換算與跨錢包彙總刻意不提供任何 API（SPEC.md §4 非目標、T3.4.3）。
 */
import type { CurrencyCode } from './currency'

export type BudgetMode = 'none' | 'weekly' | 'total'

export interface Wallet {
  readonly id: string
  readonly name: string
  readonly currency: CurrencyCode
  readonly budgetMode: BudgetMode
  /** 整數最小單位；budgetMode = 'none' 時必須為 null（SPEC.md §3.1）。 */
  readonly budgetAmount: number | null
  readonly archived: boolean
}

/** 驗證錢包欄位是否符合規則，不合法則拋 RangeError。 */
export function validateWallet(wallet: Wallet): void {
  if (wallet.name.trim() === '') {
    throw new RangeError('錢包名稱不可為空')
  }
  if (wallet.budgetMode === 'none') {
    if (wallet.budgetAmount !== null) {
      throw new RangeError('budgetMode 為 none 時 budgetAmount 必須是 null')
    }
    return
  }
  if (
    wallet.budgetAmount === null ||
    !Number.isInteger(wallet.budgetAmount) ||
    wallet.budgetAmount < 0
  ) {
    throw new RangeError(`budgetAmount 必須是非負整數: ${wallet.budgetAmount}`)
  }
}
