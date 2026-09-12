import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { describe, it, expect } from 'vitest'
import { AppDatabase } from '../../src/persistence/db'
import { DEFAULT_CATEGORIES } from '../../src/domain/category'

/**
 * T7.7.1～T7.7.3 — Dexie v1 → v2 migration（分類固定色，Phase 10）。
 *
 * 這是 T4.1.5 骨架講好的「真正加 v2 schema 時換成針對真實欄位轉換的測試」——
 * v1（Phase 3～9 的既有 schema）沒有 `color` 欄位，v2 的 `upgrade()` 要幫每個
 * 既有分類補上 `color`：預設分類依名稱＋type 對回 UI-SPEC.md §2.2 的色值，
 * 使用者自建分類補 fallback 色。用一個獨立的、只宣告 v1 schema 的 Dexie 定義
 * 先寫入資料，模擬「這台裝置在升級前就已經在用」，再用真正的 `AppDatabase`
 * （已經是 v1+v2 兩個 version）開啟同一個資料庫名稱，驗證升級後的資料正確。
 */
function v1StoresDefinition() {
  return {
    wallets: 'id, archived',
    transactions: 'id, walletId, categoryId, date',
    categories: 'id, type',
    settingsTable: 'id',
  }
}

describe('Persistence — schema migration（T7.7 分類固定色 v1 → v2）', () => {
  it('T7.7.1 — v1 資料庫含 11 個預設分類，升級到 v2 後每個分類依名稱+type 補上對應色', async () => {
    const dbName = `migration-test-${crypto.randomUUID()}`

    const v1 = new Dexie(dbName)
    v1.version(1).stores(v1StoresDefinition())
    await v1.open()
    await v1.table('categories').bulkAdd(
      DEFAULT_CATEGORIES.map((seed) => ({
        id: crypto.randomUUID(),
        name: seed.name,
        type: seed.type,
        icon: seed.icon,
        isDefault: true,
        // 刻意不寫 color——這是 v1 schema 的既有資料形狀。
      })),
    )
    v1.close()

    const v2 = new AppDatabase(dbName)
    await v2.open()
    const categories = await v2.categories.toArray()
    expect(categories).toHaveLength(11)
    for (const category of categories) {
      const seed = DEFAULT_CATEGORIES.find((s) => s.name === category.name && s.type === category.type)
      expect(seed).toBeDefined()
      expect(category.color).toBe(seed!.color)
    }
    v2.close()
  })

  it('T7.7.2 — v1 含一個使用者自建分類「寵物」，升級後補上 fallback 色，不拋錯', async () => {
    const dbName = `migration-test-${crypto.randomUUID()}`

    const v1 = new Dexie(dbName)
    v1.version(1).stores(v1StoresDefinition())
    await v1.open()
    await v1.table('categories').add({
      id: 'pet-category',
      name: '寵物',
      type: 'expense',
      icon: '🐶',
      isDefault: false,
    })
    v1.close()

    const v2 = new AppDatabase(dbName)
    await expect(v2.open()).resolves.not.toThrow()
    const category = await v2.categories.get('pet-category')
    expect(category?.color).toBe('#7a7a80')
    v2.close()
  })

  it('T7.7.3 — 升級後交易、錢包、設定筆數完全不變', async () => {
    const dbName = `migration-test-${crypto.randomUUID()}`

    const v1 = new Dexie(dbName)
    v1.version(1).stores(v1StoresDefinition())
    await v1.open()
    await v1.table('wallets').add({
      id: 'w1',
      name: '日常',
      currency: 'TWD',
      budgetMode: 'none',
      budgetAmount: null,
      archived: false,
    })
    await v1.table('categories').add({
      id: 'c1',
      name: '飲食',
      type: 'expense',
      icon: '🍜',
      isDefault: true,
    })
    await v1.table('transactions').add({
      id: 't1',
      walletId: 'w1',
      type: 'expense',
      amount: 100,
      categoryId: 'c1',
      date: '2026-08-11',
      createdAt: '2026-08-11T00:00:00.000Z',
      updatedAt: '2026-08-11T00:00:00.000Z',
    })
    await v1.table('settingsTable').add({
      id: 'settings',
      weekStartDay: 1,
      theme: 'system',
      defaultWalletId: 'w1',
      firstLaunchAt: null,
      lastBackupAt: null,
    })
    v1.close()

    const v2 = new AppDatabase(dbName)
    await v2.open()
    expect(await v2.wallets.count()).toBe(1)
    expect(await v2.categories.count()).toBe(1)
    expect(await v2.transactions.count()).toBe(1)
    expect(await v2.settingsTable.count()).toBe(1)
    expect(v2.verno).toBe(2)
    v2.close()
  })
})
