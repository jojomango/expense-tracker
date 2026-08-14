/**
 * Settings — 全域設定型別與預設值（SPEC.md §3.5）。
 *
 * `weekStartDay` 是全域設定：變更後所有錢包的週分組即時重算，
 * 不改變任何交易資料（本模組只描述資料形狀，重算邏輯在 `week.ts`）。
 */
import type { WeekStartDay } from './week'

export type Theme = 'light' | 'dark' | 'system'

export interface Settings {
  readonly weekStartDay: WeekStartDay
  readonly theme: Theme
  /** 開啟 app 時預設顯示的錢包；null 代表尚未選定（例如還沒有任何錢包）。 */
  readonly defaultWalletId: string | null
}

/** SPEC.md §3.5：weekStartDay 預設週一、theme 預設 system、defaultWalletId 預設第一個錢包。 */
export const DEFAULT_SETTINGS: Settings = {
  weekStartDay: 1,
  theme: 'system',
  defaultWalletId: null,
}
