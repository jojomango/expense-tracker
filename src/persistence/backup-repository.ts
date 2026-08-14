/**
 * BackupRepository — 匯出／匯入的 DB 讀寫，包住 domain 的驗證與合併邏輯
 * （SPEC.md §3.6）。
 *
 * 驗證（`parseAndValidateBackup`）在任何 DB 寫入之前就完成，所以匯入失敗時
 * 保證還沒有動到 DB——這就是 T4.2.3「整批拒絕，現有資料不變」的原子性來源，
 * 不需要額外的 rollback 機制。
 */
import { BACKUP_SCHEMA_VERSION, mergeBackups, parseAndValidateBackup, type BackupData } from '../domain/backup'
import type { Wallet } from '../domain/wallet'
import type { Transaction } from '../domain/transaction'
import type { Category } from '../domain/category'
import { DEFAULT_SETTINGS } from '../domain/settings'
import { AppDatabase, SETTINGS_ROW_ID } from './db'

export interface BackupRepository {
  exportData(): Promise<BackupData>
  /** replace 模式：清空現有資料後匯入（SPEC.md §3.6）。 */
  importReplace(text: string): Promise<void>
  /** merge 模式：以 id 為鍵合併，衝突時保留 updatedAt 較新者（SPEC.md §3.6）。 */
  importMerge(text: string): Promise<void>
}

function allTables(db: AppDatabase) {
  return [db.wallets, db.transactions, db.categories, db.settingsTable] as const
}

async function writeAll(db: AppDatabase, data: BackupData): Promise<void> {
  await db.transaction('rw', allTables(db), async () => {
    await Promise.all([
      db.wallets.clear(),
      db.transactions.clear(),
      db.categories.clear(),
      db.settingsTable.clear(),
    ])
    await Promise.all([
      db.wallets.bulkAdd(data.wallets as Wallet[]),
      db.transactions.bulkAdd(data.transactions as Transaction[]),
      db.categories.bulkAdd(data.categories as Category[]),
      db.settingsTable.put({ id: SETTINGS_ROW_ID, ...data.settings }),
    ])
  })
}

export function createBackupRepository(db: AppDatabase): BackupRepository {
  return {
    async exportData(): Promise<BackupData> {
      const [wallets, transactions, categories, settingsRow] = await Promise.all([
        db.wallets.toArray(),
        db.transactions.toArray(),
        db.categories.toArray(),
        db.settingsTable.get(SETTINGS_ROW_ID),
      ])
      const settings = settingsRow ? (({ id: _id, ...rest }) => rest)(settingsRow) : DEFAULT_SETTINGS
      return { schemaVersion: BACKUP_SCHEMA_VERSION, wallets, transactions, categories, settings }
    },

    async importReplace(text: string): Promise<void> {
      const data = parseAndValidateBackup(text)
      await writeAll(db, data)
    },

    async importMerge(text: string): Promise<void> {
      const incoming = parseAndValidateBackup(text)
      const [wallets, transactions, categories, settingsRow] = await Promise.all([
        db.wallets.toArray(),
        db.transactions.toArray(),
        db.categories.toArray(),
        db.settingsTable.get(SETTINGS_ROW_ID),
      ])
      const settings = settingsRow ? (({ id: _id, ...rest }) => rest)(settingsRow) : DEFAULT_SETTINGS
      const existing: BackupData = {
        schemaVersion: BACKUP_SCHEMA_VERSION,
        wallets,
        transactions,
        categories,
        settings,
      }
      const merged = mergeBackups(existing, incoming)
      await writeAll(db, merged)
    },
  }
}
