/**
 * App 層的 repository 組裝 — 對整個 app 只建立一個 `AppDatabase` 實例，
 * 供 `store.ts` 與其他 app 層程式碼共用（依賴注入的組裝點）。
 */
import { AppDatabase, createRepositories } from '../persistence'

export const db = new AppDatabase()
export const repos = createRepositories(db)
