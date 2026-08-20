/**
 * App 層狀態管理（Zustand）— 組裝 domain 型別與 persistence repository，
 * 供 `src/ui/` 元件使用。id／時間戳在這裡產生（見 TASKS.md Phase 3 交接筆記：
 * repository 只負責原封不動存取，產生 id 與 now 是呼叫端責任）。
 */
import { create } from 'zustand'
import type { Wallet, BudgetMode } from '../domain/wallet'
import { validateWallet, assertCanDeleteWallet, LastWalletError } from '../domain/wallet'
import type { Transaction, TransactionType } from '../domain/transaction'
import { validateTransaction } from '../domain/transaction'
import type { Category } from '../domain/category'
import type { Settings } from '../domain/settings'
import { DEFAULT_SETTINGS } from '../domain/settings'
import type { CurrencyCode } from '../domain/currency'
import type { IsoDate } from '../domain/iso-date'
import { repos } from './repositories'

export { LastWalletError }

interface AppState {
  status: 'loading' | 'ready'
  wallets: Wallet[]
  transactions: Transaction[]
  categories: Category[]
  settings: Settings

  load: () => Promise<void>

  createWallet: (input: {
    name: string
    currency: CurrencyCode
    budgetMode: BudgetMode
    budgetAmount: number | null
  }) => Promise<Wallet>
  updateWallet: (wallet: Wallet) => Promise<void>
  setWalletArchived: (id: string, archived: boolean) => Promise<void>
  deleteWallet: (id: string) => Promise<void>
  switchWallet: (id: string) => Promise<void>

  addTransaction: (input: {
    walletId: string
    type: TransactionType
    amount: number
    categoryId: string | null
    date: IsoDate
    note?: string
  }) => Promise<void>
  updateTransaction: (
    id: string,
    patch: {
      type: TransactionType
      amount: number
      categoryId: string | null
      date: IsoDate
      note?: string
    },
  ) => Promise<void>
  deleteTransaction: (id: string) => Promise<void>

  updateSettings: (patch: Partial<Settings>) => Promise<void>
}

function nowIso(): string {
  return new Date().toISOString()
}

export const useAppStore = create<AppState>((set, get) => ({
  status: 'loading',
  wallets: [],
  transactions: [],
  categories: [],
  settings: DEFAULT_SETTINGS,

  async load() {
    const [wallets, transactions, categories, settings] = await Promise.all([
      repos.wallets.list(),
      repos.transactions.list(),
      repos.categories.list(),
      repos.settings.get(),
    ])
    set({ wallets, transactions, categories, settings, status: 'ready' })
  },

  async createWallet(input) {
    const wallet: Wallet = {
      id: crypto.randomUUID(),
      name: input.name,
      currency: input.currency,
      budgetMode: input.budgetMode,
      budgetAmount: input.budgetAmount,
      archived: false,
    }
    validateWallet(wallet)
    await repos.wallets.add(wallet)

    const { settings } = get()
    const nextSettings: Settings = { ...settings, defaultWalletId: wallet.id }
    await repos.settings.update(nextSettings)

    set((state) => ({ wallets: [...state.wallets, wallet], settings: nextSettings }))
    return wallet
  },

  async updateWallet(wallet) {
    validateWallet(wallet)
    await repos.wallets.update(wallet)
    set((state) => ({
      wallets: state.wallets.map((w) => (w.id === wallet.id ? wallet : w)),
    }))
  },

  async setWalletArchived(id, archived) {
    const wallet = get().wallets.find((w) => w.id === id)
    if (!wallet) return
    await get().updateWallet({ ...wallet, archived })
  },

  async deleteWallet(id) {
    const { wallets } = get()
    assertCanDeleteWallet(wallets.length)
    await repos.wallets.remove(id)
    const remaining = wallets.filter((w) => w.id !== id)
    const { settings } = get()
    const nextSettings: Settings =
      settings.defaultWalletId === id
        ? { ...settings, defaultWalletId: remaining[0]?.id ?? null }
        : settings
    if (nextSettings !== settings) {
      await repos.settings.update(nextSettings)
    }
    set((state) => ({
      wallets: remaining,
      transactions: state.transactions.filter((t) => t.walletId !== id),
      settings: nextSettings,
    }))
  },

  async switchWallet(id) {
    const { settings } = get()
    const nextSettings: Settings = { ...settings, defaultWalletId: id }
    await repos.settings.update(nextSettings)
    set({ settings: nextSettings })
  },

  async addTransaction(input) {
    const timestamp = nowIso()
    const transaction: Transaction = {
      id: crypto.randomUUID(),
      walletId: input.walletId,
      type: input.type,
      amount: input.amount,
      categoryId: input.categoryId,
      date: input.date,
      ...(input.note !== undefined ? { note: input.note } : {}),
      createdAt: timestamp,
      updatedAt: timestamp,
    }
    validateTransaction(transaction)
    await repos.transactions.add(transaction)
    set((state) => ({ transactions: [...state.transactions, transaction] }))
  },

  async updateTransaction(id, patch) {
    const existing = get().transactions.find((t) => t.id === id)
    if (!existing) return
    const updated: Transaction = { ...existing, ...patch, updatedAt: nowIso() }
    validateTransaction(updated)
    await repos.transactions.update(updated)
    set((state) => ({
      transactions: state.transactions.map((t) => (t.id === id ? updated : t)),
    }))
  },

  async deleteTransaction(id) {
    await repos.transactions.remove(id)
    set((state) => ({ transactions: state.transactions.filter((t) => t.id !== id) }))
  },

  async updateSettings(patch) {
    const { settings } = get()
    const next: Settings = { ...settings, ...patch }
    await repos.settings.update(next)
    set({ settings: next })
  },
}))

/** 目前選定的錢包：settings.defaultWalletId 對應的錢包，否則退回第一個未封存的錢包。 */
export function selectCurrentWallet(state: AppState): Wallet | null {
  const active = state.wallets.filter((w) => !w.archived)
  const byDefault = state.settings.defaultWalletId
    ? active.find((w) => w.id === state.settings.defaultWalletId)
    : undefined
  return byDefault ?? active[0] ?? null
}
