/**
 * Backup — 匯出／匯入的資料形狀、schema 驗證與 merge 邏輯（SPEC.md §3.6）。
 *
 * 只處理「這包 JSON 資料合不合法」與「兩包資料怎麼合併」，不碰檔案系統或
 * IndexedDB——實際讀寫交給 persistence 層。`JSON.parse` 是語言內建能力，
 * 不是外部套件，所以留在 domain 不違反零依賴（P1）。
 */
import { validateWallet, type Wallet } from './wallet'
import { validateTransaction, type Transaction } from './transaction'
import { validateCategory, type Category } from './category'
import { DEFAULT_SETTINGS, type Settings } from './settings'

/** 目前 app 支援讀寫的備份 schema 版本（SPEC.md §3.6）。 */
export const BACKUP_SCHEMA_VERSION = 1

export interface BackupData {
  readonly schemaVersion: number
  readonly wallets: readonly Wallet[]
  readonly transactions: readonly Transaction[]
  readonly categories: readonly Category[]
  readonly settings: Settings
}

export class BackupError extends Error {}

/** 檔案內容不是合法 JSON（T4.2.4）。 */
export class BackupParseError extends BackupError {
  constructor() {
    super('備份檔不是合法的 JSON 格式')
    this.name = 'BackupParseError'
  }
}

/** 備份檔的 schema version 比目前 app 支援的新，須先更新 app（T4.2.2）。 */
export class BackupVersionError extends BackupError {
  constructor(fileVersion: number) {
    super(
      `備份檔的 schema version (${fileVersion}) 比目前 app 支援的版本 ` +
        `(${BACKUP_SCHEMA_VERSION}) 新，請先更新 app 再匯入`,
    )
    this.name = 'BackupVersionError'
  }
}

/** 備份資料缺少必要欄位、格式不合法，或參照完整性有誤（T4.2.3、T4.2.8）。 */
export class BackupValidationError extends BackupError {
  constructor(message: string) {
    super(message)
    this.name = 'BackupValidationError'
  }
}

/** 把備份檔的原始文字剖析成物件，不是合法 JSON 就拋出可讀錯誤，不 crash（T4.2.4）。 */
export function parseBackupJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    throw new BackupParseError()
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function describeId(entity: unknown): string {
  if (isPlainObject(entity) && typeof entity.id === 'string') return entity.id
  return '(未知)'
}

/**
 * 驗證備份資料的完整性：結構、每筆實體的欄位規則、交易的參照完整性。
 * 任何一筆不合法就整批拒絕，不做部分匯入（T4.2.3，原子性）。
 * schema version 比目前支援的新一律拒絕（T4.2.2）。
 */
export function validateBackupData(data: unknown): BackupData {
  if (!isPlainObject(data)) {
    throw new BackupValidationError('備份檔缺少必要欄位')
  }

  const { schemaVersion, wallets, transactions, categories, settings } = data

  if (typeof schemaVersion !== 'number' || !Number.isInteger(schemaVersion) || schemaVersion < 1) {
    throw new BackupValidationError('備份檔缺少合法的 schemaVersion')
  }
  if (schemaVersion > BACKUP_SCHEMA_VERSION) {
    throw new BackupVersionError(schemaVersion)
  }
  if (!Array.isArray(wallets) || !Array.isArray(transactions) || !Array.isArray(categories)) {
    throw new BackupValidationError('備份檔缺少 wallets / transactions / categories 陣列')
  }
  if (!isPlainObject(settings)) {
    throw new BackupValidationError('備份檔缺少 settings')
  }

  const typedWallets = wallets as Wallet[]
  const typedCategories = categories as Category[]
  const typedTransactions = transactions as Transaction[]

  for (const wallet of typedWallets) {
    try {
      validateWallet(wallet)
    } catch (err) {
      throw new BackupValidationError(
        `錢包資料不合法（id: ${describeId(wallet)}）：${(err as Error).message}`,
      )
    }
  }
  for (const category of typedCategories) {
    try {
      validateCategory(category)
    } catch (err) {
      throw new BackupValidationError(
        `分類資料不合法（id: ${describeId(category)}）：${(err as Error).message}`,
      )
    }
  }

  const walletIds = new Set(typedWallets.map((w) => w.id))
  const categoryIds = new Set(typedCategories.map((c) => c.id))

  for (const transaction of typedTransactions) {
    try {
      validateTransaction(transaction)
    } catch (err) {
      throw new BackupValidationError(
        `交易資料不合法（id: ${describeId(transaction)}）：${(err as Error).message}`,
      )
    }
    if (!walletIds.has(transaction.walletId)) {
      throw new BackupValidationError(
        `交易引用不存在的錢包（walletId: ${transaction.walletId}）`,
      )
    }
    if (transaction.categoryId !== null && !categoryIds.has(transaction.categoryId)) {
      throw new BackupValidationError(
        `交易引用不存在的分類（categoryId: ${transaction.categoryId}）`,
      )
    }
  }

  return {
    schemaVersion,
    wallets: typedWallets,
    transactions: typedTransactions,
    categories: typedCategories,
    settings: { ...DEFAULT_SETTINGS, ...(settings as Partial<Settings>) },
  }
}

/** 剖析並驗證備份檔文字，一次做完（T4.2.2 + T4.2.3 + T4.2.4 + T4.2.8）。 */
export function parseAndValidateBackup(text: string): BackupData {
  return validateBackupData(parseBackupJson(text))
}

/** 匯出時序列化成人類可讀的 JSON 字串。 */
export function serializeBackup(data: BackupData): string {
  return JSON.stringify(data, null, 2)
}

interface Identified {
  readonly id: string
  readonly updatedAt?: string
}

/**
 * 以 id 為鍵合併兩份清單，衝突時保留 `updatedAt` 較新者（SPEC.md §3.6、T4.2.5）；
 * id 不衝突則兩邊都保留（T4.2.6）。
 *
 * `Wallet` / `Category` 目前沒有 `updatedAt` 欄位（只有 `Transaction` 有），
 * 兩者都沒有時間可比較時，設計上讓匯入資料覆蓋現有資料——
 * 這是本 phase 補上的預設行為，TASKS.md 交接筆記有記錄，非 TESTCASES 明文規定。
 */
function mergeById<T extends Identified>(existing: readonly T[], incoming: readonly T[]): T[] {
  const byId = new Map<string, T>()
  for (const item of existing) byId.set(item.id, item)
  for (const item of incoming) {
    const current = byId.get(item.id)
    if (!current || !current.updatedAt || !item.updatedAt || item.updatedAt >= current.updatedAt) {
      byId.set(item.id, item)
    }
  }
  return [...byId.values()]
}

/** merge 模式：合併兩份已各自驗證過的備份資料（T4.2.5、T4.2.6）。 */
export function mergeBackups(existing: BackupData, incoming: BackupData): BackupData {
  return {
    schemaVersion: BACKUP_SCHEMA_VERSION,
    wallets: mergeById(existing.wallets, incoming.wallets),
    categories: mergeById(existing.categories, incoming.categories),
    transactions: mergeById(existing.transactions, incoming.transactions),
    settings: incoming.settings,
  }
}
