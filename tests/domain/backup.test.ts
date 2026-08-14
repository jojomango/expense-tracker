import { describe, it, expect } from 'vitest'
import {
  parseBackupJson,
  validateBackupData,
  parseAndValidateBackup,
  serializeBackup,
  mergeBackups,
  BackupParseError,
  BackupVersionError,
  BackupValidationError,
  BACKUP_SCHEMA_VERSION,
  type BackupData,
} from '../../src/domain/backup'
import { DEFAULT_SETTINGS } from '../../src/domain/settings'
import { toIsoDate } from '../../src/domain/iso-date'

const wallet1 = {
  id: 'w1',
  name: '日常',
  currency: 'TWD',
  budgetMode: 'none' as const,
  budgetAmount: null,
  archived: false,
}

const category1 = {
  id: 'c1',
  name: '飲食',
  type: 'expense' as const,
  icon: '🍜',
  isDefault: true,
}

function transaction(overrides: Partial<BackupData['transactions'][number]> = {}) {
  return {
    id: 't1',
    walletId: 'w1',
    type: 'expense' as const,
    amount: 100,
    categoryId: 'c1',
    date: toIsoDate('2026-08-11'),
    createdAt: '2026-08-11T00:00:00.000Z',
    updatedAt: '2026-08-11T00:00:00.000Z',
    ...overrides,
  }
}

function validBackup(overrides: Partial<BackupData> = {}): BackupData {
  return {
    schemaVersion: BACKUP_SCHEMA_VERSION,
    wallets: [wallet1],
    categories: [category1],
    transactions: [transaction()],
    settings: DEFAULT_SETTINGS,
    ...overrides,
  }
}

describe('parseBackupJson — T4.2.4 匯入格式錯誤的 JSON', () => {
  it('T4.2.4 — 格式錯誤的 JSON 拋出可讀錯誤，不 crash', () => {
    expect(() => parseBackupJson('{not valid json')).toThrow(BackupParseError)
  })

  it('合法 JSON 正常剖析', () => {
    expect(parseBackupJson('{"a":1}')).toEqual({ a: 1 })
  })
})

describe('validateBackupData — T4.2.2 拒絕較新的 schema version', () => {
  it('T4.2.2 — schemaVersion 比目前支援的新時拒絕，提示需更新 app', () => {
    const data = validBackup({ schemaVersion: BACKUP_SCHEMA_VERSION + 1 })
    expect(() => validateBackupData(data)).toThrow(BackupVersionError)
  })

  it('schemaVersion 等於目前支援版本時合法', () => {
    expect(() => validateBackupData(validBackup())).not.toThrow()
  })
})

describe('validateBackupData — T4.2.3 缺少必要欄位時整批拒絕', () => {
  it('T4.2.3 — 頂層缺少 wallets 欄位時整批拒絕', () => {
    const data = validBackup() as unknown as Record<string, unknown>
    const { wallets: _wallets, ...withoutWallets } = data
    expect(() => validateBackupData(withoutWallets)).toThrow(BackupValidationError)
  })

  it('T4.2.3 — 交易缺少必要欄位（amount 缺失）時整批拒絕', () => {
    const bad = transaction() as unknown as Record<string, unknown>
    delete bad.amount
    const data = validBackup({ transactions: [bad as never] })
    expect(() => validateBackupData(data)).toThrow(BackupValidationError)
  })

  it('不是物件（例如陣列或 null）時拒絕', () => {
    expect(() => validateBackupData(null)).toThrow(BackupValidationError)
    expect(() => validateBackupData([1, 2, 3])).toThrow(BackupValidationError)
  })
})

describe('validateBackupData — T4.2.8 交易參照完整性', () => {
  it('T4.2.8 — 交易引用不存在的 categoryId 時拒絕', () => {
    const data = validBackup({ transactions: [transaction({ categoryId: 'ghost' })] })
    expect(() => validateBackupData(data)).toThrow(BackupValidationError)
  })

  it('交易引用不存在的 walletId 時拒絕', () => {
    const data = validBackup({ transactions: [transaction({ walletId: 'ghost' })] })
    expect(() => validateBackupData(data)).toThrow(BackupValidationError)
  })

  it('categoryId 為 null（未分類）時合法，不視為參照錯誤', () => {
    const data = validBackup({ transactions: [transaction({ categoryId: null })] })
    expect(() => validateBackupData(data)).not.toThrow()
  })
})

describe('parseAndValidateBackup — T4.2.4 + T4.2.2/3/8 串接', () => {
  it('文字剖析與驗證一次做完', () => {
    const text = JSON.stringify(validBackup())
    expect(parseAndValidateBackup(text)).toMatchObject({ schemaVersion: BACKUP_SCHEMA_VERSION })
  })
})

describe('serializeBackup — 匯出序列化', () => {
  it('序列化後可以再剖析回相同資料（round-trip）', () => {
    const data = validBackup()
    const text = serializeBackup(data)
    expect(JSON.parse(text)).toEqual(data)
  })
})

describe('mergeBackups — T4.2.5 id 衝突保留 updatedAt 較新者', () => {
  it('T4.2.5 — 交易 id 衝突時保留 updatedAt 較新者', () => {
    const older = transaction({ id: 'dup', amount: 100, updatedAt: '2026-08-01T00:00:00.000Z' })
    const newer = transaction({ id: 'dup', amount: 999, updatedAt: '2026-08-10T00:00:00.000Z' })
    const existing = validBackup({ transactions: [older] })
    const incoming = validBackup({ transactions: [newer] })
    const merged = mergeBackups(existing, incoming)
    expect(merged.transactions).toEqual([newer])
  })

  it('T4.2.5 — 現有資料較新時，合併後保留現有資料，不被較舊的匯入資料覆蓋', () => {
    const newer = transaction({ id: 'dup', amount: 999, updatedAt: '2026-08-10T00:00:00.000Z' })
    const older = transaction({ id: 'dup', amount: 100, updatedAt: '2026-08-01T00:00:00.000Z' })
    const existing = validBackup({ transactions: [newer] })
    const incoming = validBackup({ transactions: [older] })
    const merged = mergeBackups(existing, incoming)
    expect(merged.transactions).toEqual([newer])
  })
})

describe('mergeBackups — T4.2.6 id 不衝突時兩邊資料皆保留', () => {
  it('T4.2.6 — 不同 id 的交易合併後兩邊都保留', () => {
    const existing = validBackup({ transactions: [transaction({ id: 't1' })] })
    const incoming = validBackup({ transactions: [transaction({ id: 't2' })] })
    const merged = mergeBackups(existing, incoming)
    expect(merged.transactions.map((t) => t.id).sort()).toEqual(['t1', 't2'])
  })

  it('T4.2.6 — 不同 id 的錢包合併後兩邊都保留', () => {
    const existing = validBackup({ wallets: [wallet1] })
    const incoming = validBackup({ wallets: [{ ...wallet1, id: 'w2', name: '旅遊' }] })
    const merged = mergeBackups(existing, incoming)
    expect(merged.wallets.map((w) => w.id).sort()).toEqual(['w1', 'w2'])
  })
})

describe('mergeBackups — 沒有 updatedAt 可比較的實體（Wallet / Category）', () => {
  it('id 衝突時以匯入資料覆蓋現有資料（本 phase 的預設行為，見 TASKS.md 交接筆記）', () => {
    const existing = validBackup({ wallets: [wallet1] })
    const incoming = validBackup({ wallets: [{ ...wallet1, name: '改名後' }] })
    const merged = mergeBackups(existing, incoming)
    expect(merged.wallets).toEqual([{ ...wallet1, name: '改名後' }])
  })
})
