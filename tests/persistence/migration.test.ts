import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { describe, it, expect } from 'vitest'

/**
 * T4.1.5 — Schema v1 → v2 migration 骨架。
 *
 * v1 目前是唯一版本，還沒有真正的 v2 需求，所以這個測案先建立「升級鏈可以正確
 * 保留既有資料」的骨架與證明：用一個獨立的 Dexie 定義模擬「未來新增 v2」，
 * 確認既有資料在版本升級後依然完整。真正加 v2 schema 時，比照這個模式在
 * `src/persistence/db.ts` 加一個新的 `.version(2).stores(...).upgrade(...)`，
 * 並把這個骨架換成針對真實欄位轉換的測試即可。
 */
describe('Persistence — schema migration 骨架', () => {
  it('T4.1.5 — v1 → v2 migration 保留既有資料', async () => {
    const dbName = `migration-test-${crypto.randomUUID()}`

    const v1 = new Dexie(dbName)
    v1.version(1).stores({ wallets: 'id, archived' })
    await v1.open()
    await v1.table('wallets').add({
      id: 'w1',
      name: '日常',
      currency: 'TWD',
      budgetMode: 'none',
      budgetAmount: null,
      archived: false,
    })
    v1.close()

    const v2 = new Dexie(dbName)
    v2.version(1).stores({ wallets: 'id, archived' })
    v2.version(2)
      .stores({ wallets: 'id, archived, name' })
      .upgrade(() => {
        // 骨架：未來若 v2 需要資料轉換（例如補欄位預設值），在這裡寫轉換邏輯。
      })
    await v2.open()

    const wallets = await v2.table('wallets').toArray()
    expect(wallets).toHaveLength(1)
    expect(wallets[0]).toMatchObject({ id: 'w1', name: '日常', currency: 'TWD' })
    expect(v2.verno).toBe(2)
    v2.close()
  })
})
