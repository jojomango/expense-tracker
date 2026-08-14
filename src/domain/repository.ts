/**
 * Repository 介面 — domain 定義「有哪些操作」，persistence 實作「怎麼做」
 * （SPEC.md §6 Phase 3：「Repository 介面，domain 定義介面，persistence 實作 →
 * 未來可換 SQLite」）。
 *
 * 這裡只有型別，沒有任何執行邏輯，所以不違反 domain 零依賴的禁令——
 * 純粹是給 persistence 層遵守的契約。未來 Android 版本只要重寫
 * `src/persistence/`（不論走 SQLite 或其他方案），domain 與呼叫端程式碼都不必改。
 */
import type { Wallet } from './wallet'
import type { Transaction } from './transaction'
import type { Category } from './category'
import type { Settings } from './settings'

export interface WalletRepository {
  list(): Promise<Wallet[]>
  add(wallet: Wallet): Promise<void>
  update(wallet: Wallet): Promise<void>
  /**
   * 連同該錢包的所有交易一併刪除（SPEC.md §3.1，原子性）。
   * 刪除最後一個錢包時必須拋出 `LastWalletError`（見 `wallet.ts`）。
   */
  remove(id: string): Promise<void>
}

export interface TransactionRepository {
  list(): Promise<Transaction[]>
  listByWallet(walletId: string): Promise<Transaction[]>
  add(transaction: Transaction): Promise<void>
  update(transaction: Transaction): Promise<void>
  remove(id: string): Promise<void>
}

export interface CategoryRepository {
  list(): Promise<Category[]>
  add(category: Category): Promise<void>
  update(category: Category): Promise<void>
  /**
   * 刪除分類時，所有引用該分類的交易 `categoryId` 改為 `null`（未分類），
   * 交易本身不連帶刪除（SPEC.md §3.3，見 `category.ts` 的 `reassignDeletedCategory`）。
   */
  remove(id: string): Promise<void>
}

export interface SettingsRepository {
  get(): Promise<Settings>
  update(settings: Settings): Promise<void>
}

/** 一組完整的 repository，供 app 層依賴注入使用。 */
export interface Repositories {
  readonly wallets: WalletRepository
  readonly transactions: TransactionRepository
  readonly categories: CategoryRepository
  readonly settings: SettingsRepository
}
