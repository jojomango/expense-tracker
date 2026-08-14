import 'fake-indexeddb/auto'
import { describe, it, expect } from 'vitest'
import { AppDatabase } from '../../src/persistence/db'
import { createRepositories } from '../../src/persistence/repositories'
import type { Transaction } from '../../src/domain'
import { toIsoDate } from '../../src/domain/iso-date'

function transaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: crypto.randomUUID(),
    walletId: 'w1',
    type: 'expense',
    amount: 100,
    categoryId: null,
    date: toIsoDate('2026-08-11'),
    createdAt: '2026-08-11T00:00:00.000Z',
    updatedAt: '2026-08-11T00:00:00.000Z',
    ...overrides,
  }
}

describe('TransactionRepository — T4.1.1 重新開啟 DB 後資料仍在', () => {
  it('T4.1.1 — 新增交易後重新開啟 DB，資料存在且欄位一致', async () => {
    const dbName = `tx-repo-test-${crypto.randomUUID()}`
    const t = transaction({ note: '午餐' })

    const db1 = new AppDatabase(dbName)
    await createRepositories(db1).transactions.add(t)
    db1.close()

    const db2 = new AppDatabase(dbName)
    const reopened = await createRepositories(db2).transactions.list()
    expect(reopened).toHaveLength(1)
    expect(reopened[0]).toEqual(t)
    db2.close()
  })
})

describe('TransactionRepository — T4.1.6 併發寫入同一交易', () => {
  it('T4.1.6 — 併發寫入同一筆交易，後寫入者勝出，不產生髒資料', async () => {
    const db = new AppDatabase(`tx-repo-test-${crypto.randomUUID()}`)
    const repos = createRepositories(db)
    const id = crypto.randomUUID()
    const original = transaction({ id, amount: 100, note: '原始' })
    await repos.transactions.add(original)

    const versionA = { ...original, amount: 200, note: 'A', updatedAt: '2026-08-11T01:00:00.000Z' }
    const versionB = { ...original, amount: 300, note: 'B', updatedAt: '2026-08-11T02:00:00.000Z' }

    await Promise.all([repos.transactions.update(versionA), repos.transactions.update(versionB)])

    const all = await repos.transactions.list()
    expect(all).toHaveLength(1)
    const final = all[0]
    // 不論哪個後寫入，最終紀錄必須完整等於其中一個版本，欄位不可混雜（無髒資料）。
    expect([versionA, versionB]).toContainEqual(final)
    db.close()
  })
})
