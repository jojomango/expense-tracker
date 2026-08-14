import 'fake-indexeddb/auto'
import { describe, it, expect } from 'vitest'
import { AppDatabase } from '../../src/persistence/db'
import { createRepositories } from '../../src/persistence/repositories'
import { createBackupRepository } from '../../src/persistence/backup-repository'
import { serializeBackup } from '../../src/domain/backup'
import type { Transaction, Wallet } from '../../src/domain'
import { toIsoDate } from '../../src/domain/iso-date'

function freshDb(): AppDatabase {
  return new AppDatabase(`backup-repo-test-${crypto.randomUUID()}`)
}

describe('BackupRepository — T4.2.1 匯出後立即匯入（replace）round-trip', () => {
  it('T4.2.1 — 匯出後立即以 replace 模式匯入，資料完全一致', async () => {
    const db = freshDb()
    const repos = createRepositories(db)
    const backups = createBackupRepository(db)

    const wallet: Wallet = {
      id: crypto.randomUUID(),
      name: '日常',
      currency: 'TWD',
      budgetMode: 'weekly',
      budgetAmount: 300000,
      archived: false,
    }
    await repos.wallets.add(wallet)
    const [category] = await repos.categories.list()
    if (!category) throw new Error('預期至少有一個預設分類')
    const t: Transaction = {
      id: crypto.randomUUID(),
      walletId: wallet.id,
      type: category.type,
      amount: 5000,
      categoryId: category.id,
      date: toIsoDate('2026-08-11'),
      createdAt: '2026-08-11T00:00:00.000Z',
      updatedAt: '2026-08-11T00:00:00.000Z',
    }
    await repos.transactions.add(t)

    const before = await backups.exportData()
    const text = serializeBackup(before)

    await backups.importReplace(text)

    const after = await backups.exportData()
    expect(after.wallets).toEqual(before.wallets)
    expect(after.transactions).toEqual(before.transactions)
    expect(after.categories).toEqual(before.categories)
    expect(after.settings).toEqual(before.settings)
    db.close()
  })
})

describe('BackupRepository — T4.2.7 大量資料匯入效能', () => {
  it(
    'T4.2.7 — 匯入 10,000 筆交易 3 秒內完成',
    async () => {
      const db = freshDb()
      const repos = createRepositories(db)
      const backups = createBackupRepository(db)

      const wallet: Wallet = {
        id: crypto.randomUUID(),
        name: '日常',
        currency: 'TWD',
        budgetMode: 'none',
        budgetAmount: null,
        archived: false,
      }
      const [category] = await repos.categories.list()
      if (!category) throw new Error('預期至少有一個預設分類')

      const transactions: Transaction[] = Array.from({ length: 10_000 }, (_, i) => ({
        id: `t-${i}`,
        walletId: wallet.id,
        type: category.type,
        amount: 100,
        categoryId: category.id,
        date: toIsoDate('2026-08-11'),
        createdAt: '2026-08-11T00:00:00.000Z',
        updatedAt: '2026-08-11T00:00:00.000Z',
      }))

      const existingCategories = await repos.categories.list()
      const text = serializeBackup({
        schemaVersion: 1,
        wallets: [wallet],
        categories: existingCategories,
        transactions,
        settings: { weekStartDay: 1, theme: 'system', defaultWalletId: wallet.id },
      })

      const start = performance.now()
      await backups.importReplace(text)
      const elapsedMs = performance.now() - start

      const all = await repos.transactions.list()
      expect(all).toHaveLength(10_000)
      expect(elapsedMs).toBeLessThan(3000)
      db.close()
    },
    { timeout: 10_000 },
  )
})
