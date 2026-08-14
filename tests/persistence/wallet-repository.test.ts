import 'fake-indexeddb/auto'
import { describe, it, expect } from 'vitest'
import { AppDatabase } from '../../src/persistence/db'
import { createRepositories } from '../../src/persistence/repositories'
import { LastWalletError, type Wallet, type Transaction } from '../../src/domain'
import { toIsoDate } from '../../src/domain/iso-date'

function freshDb(): AppDatabase {
  return new AppDatabase(`wallet-repo-test-${crypto.randomUUID()}`)
}

function wallet(overrides: Partial<Wallet> = {}): Wallet {
  return {
    id: crypto.randomUUID(),
    name: '日常',
    currency: 'TWD',
    budgetMode: 'none',
    budgetAmount: null,
    archived: false,
    ...overrides,
  }
}

function transaction(walletId: string, overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: crypto.randomUUID(),
    walletId,
    type: 'expense',
    amount: 100,
    categoryId: null,
    date: toIsoDate('2026-08-11'),
    createdAt: '2026-08-11T00:00:00.000Z',
    updatedAt: '2026-08-11T00:00:00.000Z',
    ...overrides,
  }
}

describe('WalletRepository — T4.1.2 刪除錢包連同交易一併刪除', () => {
  it('T4.1.2 — 刪除錢包時，其所有交易一併刪除，其他錢包不受影響', async () => {
    const db = freshDb()
    const repos = createRepositories(db)
    const walletA = wallet({ name: '日常' })
    const walletB = wallet({ name: '旅遊' })
    await repos.wallets.add(walletA)
    await repos.wallets.add(walletB)
    await repos.transactions.add(transaction(walletA.id))
    await repos.transactions.add(transaction(walletA.id))
    await repos.transactions.add(transaction(walletB.id))

    await repos.wallets.remove(walletA.id)

    const remainingWallets = await repos.wallets.list()
    expect(remainingWallets.map((w) => w.id)).toEqual([walletB.id])

    const remainingTransactions = await repos.transactions.list()
    expect(remainingTransactions).toHaveLength(1)
    expect(remainingTransactions[0]?.walletId).toBe(walletB.id)
    db.close()
  })
})

describe('WalletRepository — T4.1.3 不可刪除最後一個錢包', () => {
  it('T4.1.3 — 刪除最後一個錢包時被拒絕，拋出明確錯誤', async () => {
    const db = freshDb()
    const repos = createRepositories(db)
    const onlyWallet = wallet()
    await repos.wallets.add(onlyWallet)

    await expect(repos.wallets.remove(onlyWallet.id)).rejects.toThrow(LastWalletError)

    const remaining = await repos.wallets.list()
    expect(remaining).toHaveLength(1)
    db.close()
  })

  it('刪除後還有其他錢包時允許刪除', async () => {
    const db = freshDb()
    const repos = createRepositories(db)
    const walletA = wallet()
    const walletB = wallet({ name: '旅遊' })
    await repos.wallets.add(walletA)
    await repos.wallets.add(walletB)

    await expect(repos.wallets.remove(walletA.id)).resolves.not.toThrow()
    db.close()
  })
})
