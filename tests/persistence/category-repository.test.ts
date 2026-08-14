import 'fake-indexeddb/auto'
import { describe, it, expect } from 'vitest'
import { AppDatabase } from '../../src/persistence/db'
import { createRepositories } from '../../src/persistence/repositories'
import type { Transaction } from '../../src/domain'
import { toIsoDate } from '../../src/domain/iso-date'

function freshDb(): AppDatabase {
  return new AppDatabase(`category-repo-test-${crypto.randomUUID()}`)
}

describe('CategoryRepository — T4.1.4 首次啟動自動建立預設分類', () => {
  it('T4.1.4 — 首次啟動自動建立 7 個支出分類與 4 個收入分類', async () => {
    const db = freshDb()
    const categories = await createRepositories(db).categories.list()
    expect(categories.filter((c) => c.type === 'expense')).toHaveLength(7)
    expect(categories.filter((c) => c.type === 'income')).toHaveLength(4)
    expect(categories.every((c) => c.isDefault)).toBe(true)
    db.close()
  })

  it('重新開啟同一個 DB 不會重複建立預設分類', async () => {
    const dbName = `category-repo-test-${crypto.randomUUID()}`
    const db1 = new AppDatabase(dbName)
    await createRepositories(db1).categories.list()
    db1.close()

    const db2 = new AppDatabase(dbName)
    const categories = await createRepositories(db2).categories.list()
    expect(categories).toHaveLength(11)
    db2.close()
  })
})

describe('CategoryRepository — 刪除分類時交易轉移到未分類（SPEC.md §3.3）', () => {
  it('刪除有交易的分類時，交易的 categoryId 改為 null，交易不遺失', async () => {
    const db = freshDb()
    const repos = createRepositories(db)
    const [firstCategory] = await repos.categories.list()
    if (!firstCategory) throw new Error('預期至少有一個預設分類')

    const t: Transaction = {
      id: crypto.randomUUID(),
      walletId: 'w1',
      type: firstCategory.type,
      amount: 100,
      categoryId: firstCategory.id,
      date: toIsoDate('2026-08-11'),
      createdAt: '2026-08-11T00:00:00.000Z',
      updatedAt: '2026-08-11T00:00:00.000Z',
    }
    await repos.transactions.add(t)

    await repos.categories.remove(firstCategory.id)

    const remainingTransactions = await repos.transactions.list()
    expect(remainingTransactions).toHaveLength(1)
    expect(remainingTransactions[0]?.categoryId).toBeNull()

    const remainingCategories = await repos.categories.list()
    expect(remainingCategories.find((c) => c.id === firstCategory.id)).toBeUndefined()
    db.close()
  })
})
