/**
 * AppDatabase — Dexie(IndexedDB) schema（SPEC.md §6 Phase 3）。
 *
 * Schema version 從 1 開始（SPEC.md §6）。首次開啟（`populate`）自動建立
 * 預設分類（SPEC.md §3.3）與預設設定（SPEC.md §3.5）——這裡不建立任何錢包，
 * 「建立第一個錢包」是 Phase 4 的首次啟動引導負責的事。
 *
 * 之後若要新增 schema version，比照 `tests/persistence/migration.test.ts`
 * 的骨架，加一個新的 `.version(n).stores(...).upgrade(...)`。
 */
import Dexie, { type Table } from 'dexie'
import type { Wallet } from '../domain/wallet'
import type { Transaction } from '../domain/transaction'
import type { Category } from '../domain/category'
import { DEFAULT_CATEGORIES } from '../domain/category'
import type { Settings } from '../domain/settings'
import { DEFAULT_SETTINGS } from '../domain/settings'

/** settingsTable 只會有這一筆單例紀錄。 */
export const SETTINGS_ROW_ID = 'settings'

export interface SettingsRow extends Settings {
  readonly id: typeof SETTINGS_ROW_ID
}

export class AppDatabase extends Dexie {
  wallets!: Table<Wallet, string>
  transactions!: Table<Transaction, string>
  categories!: Table<Category, string>
  settingsTable!: Table<SettingsRow, string>

  constructor(name = 'expense-tracker') {
    super(name)

    this.version(1).stores({
      wallets: 'id, archived',
      transactions: 'id, walletId, categoryId, date',
      categories: 'id, type',
      settingsTable: 'id',
    })

    this.on('populate', () => this.seedDefaults())
  }

  private async seedDefaults(): Promise<void> {
    const categories: Category[] = DEFAULT_CATEGORIES.map((seed) => ({
      id: crypto.randomUUID(),
      ...seed,
      isDefault: true,
    }))
    await this.categories.bulkAdd(categories)
    await this.settingsTable.put({ id: SETTINGS_ROW_ID, ...DEFAULT_SETTINGS })
  }
}
