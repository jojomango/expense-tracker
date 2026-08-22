/**
 * Dexie 實作 domain 定義的 Repository 介面（`src/domain/repository.ts`）。
 *
 * `add` / `update` 接收「完整的」domain 實體（含 id / createdAt / updatedAt）——
 * 產生 id 與時間戳是呼叫端（未來 Phase 4 的 app 層）的責任，理由是那層本來就需要
 * 「現在時間」來處理日期預設值（SPEC.md §3.2），把產生邏輯放在這裡反而要多繞一層。
 * Repository 在這裡的角色單純是「原封不動存進去、原封不動讀出來」。
 */
import { assertCanDeleteWallet, type Wallet } from '../domain/wallet'
import type { Transaction } from '../domain/transaction'
import { assertCanDeleteCategory, reassignDeletedCategory, type Category } from '../domain/category'
import { DEFAULT_SETTINGS, type Settings } from '../domain/settings'
import type {
  WalletRepository,
  TransactionRepository,
  CategoryRepository,
  SettingsRepository,
  Repositories,
} from '../domain/repository'
import { AppDatabase, SETTINGS_ROW_ID } from './db'

class DexieWalletRepository implements WalletRepository {
  constructor(private readonly db: AppDatabase) {}

  list(): Promise<Wallet[]> {
    return this.db.wallets.toArray()
  }

  async add(wallet: Wallet): Promise<void> {
    await this.db.wallets.add(wallet)
  }

  async update(wallet: Wallet): Promise<void> {
    await this.db.wallets.put(wallet)
  }

  async remove(id: string): Promise<void> {
    await this.db.transaction('rw', this.db.wallets, this.db.transactions, async () => {
      const walletCount = await this.db.wallets.count()
      assertCanDeleteWallet(walletCount)
      await this.db.transactions.where('walletId').equals(id).delete()
      await this.db.wallets.delete(id)
    })
  }
}

class DexieTransactionRepository implements TransactionRepository {
  constructor(private readonly db: AppDatabase) {}

  list(): Promise<Transaction[]> {
    return this.db.transactions.toArray()
  }

  listByWallet(walletId: string): Promise<Transaction[]> {
    return this.db.transactions.where('walletId').equals(walletId).toArray()
  }

  async add(transaction: Transaction): Promise<void> {
    await this.db.transactions.add(transaction)
  }

  async update(transaction: Transaction): Promise<void> {
    await this.db.transactions.put(transaction)
  }

  async remove(id: string): Promise<void> {
    await this.db.transactions.delete(id)
  }
}

class DexieCategoryRepository implements CategoryRepository {
  constructor(private readonly db: AppDatabase) {}

  list(): Promise<Category[]> {
    return this.db.categories.toArray()
  }

  async add(category: Category): Promise<void> {
    await this.db.categories.add(category)
  }

  async update(category: Category): Promise<void> {
    await this.db.categories.put(category)
  }

  async remove(id: string): Promise<void> {
    await this.db.transaction('rw', this.db.categories, this.db.transactions, async () => {
      const category = await this.db.categories.get(id)
      if (category) {
        assertCanDeleteCategory(category)
      }
      const affected = await this.db.transactions.where('categoryId').equals(id).toArray()
      const reassigned = reassignDeletedCategory(affected, id)
      if (reassigned.length > 0) {
        await this.db.transactions.bulkPut(reassigned)
      }
      await this.db.categories.delete(id)
    })
  }
}

class DexieSettingsRepository implements SettingsRepository {
  constructor(private readonly db: AppDatabase) {}

  async get(): Promise<Settings> {
    const row = await this.db.settingsTable.get(SETTINGS_ROW_ID)
    if (!row) return DEFAULT_SETTINGS
    const { id: _id, ...settings } = row
    return settings
  }

  async update(settings: Settings): Promise<void> {
    await this.db.settingsTable.put({ id: SETTINGS_ROW_ID, ...settings })
  }
}

export function createRepositories(db: AppDatabase): Repositories {
  return {
    wallets: new DexieWalletRepository(db),
    transactions: new DexieTransactionRepository(db),
    categories: new DexieCategoryRepository(db),
    settings: new DexieSettingsRepository(db),
  }
}
