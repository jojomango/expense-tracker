# TASKS.md — Phase 狀態機

> **這個檔案是 agent 的記憶體。**
> Context window 不會跨 session 保留，但 git 會。所有進度狀態都存在這裡。
>
> 標記說明：`✅ DONE` 已完成並合併 ／ `**NEXT**` 下一個要做的 ／ `⬜ TODO` 尚未開始 ／ `🚧 WIP` 有未合併的 PR

---

## 進度總覽

| Phase | 名稱 | 狀態 | PR |
|---|---|---|---|
| 0 | 地基 | ✅ DONE | — |
| 1 | Domain：金額與時間 | ✅ DONE | [#1](https://github.com/jojomango/expense-tracker/pull/1) |
| 2 | Domain：實體與預算計算 | ✅ DONE | [#2](https://github.com/jojomango/expense-tracker/pull/2) |
| 3 | 持久層與匯出匯入 | ✅ DONE | [#3](https://github.com/jojomango/expense-tracker/pull/3) |
| 4 | 基礎 UI：錢包與交易 CRUD | ✅ DONE | （待補） |
| 5 | 預算與即時餘額 | **NEXT** | |
| 6 | 分類與統計 | ⬜ TODO | |
| 7 | PWA、備份與打磨 | ⬜ TODO | |

---

## Phase 0 — 地基 ✅ DONE

**產出：** Vite + React + TS + Tailwind 骨架、Vitest、Playwright、
架構純淨度檢查、CI 流水線、GitHub Pages 部署、`CLAUDE.md`、`TASKS.md`

**驗收：** 空白頁成功部署，CI 全綠。

### 交接筆記

- `src/domain/iso-date.ts` 已存在，是 Phase 0 的示範模組，也是**真正會用到的工具**。
  提供 `IsoDate` branded type、`isIsoDate`、`toIsoDate`、`todayIso(now)`、`compareIsoDate`。
  **Phase 1 請直接沿用，不要重寫。**
- `todayIso` 刻意要求傳入 `now: Date` —— 這是全專案的慣例：
  **任何需要「現在」的函式都必須把時間當參數注入。**
- 覆蓋率門檻設在 `vitest.config.ts`，只計算 `src/domain/**`，門檻 90%。
  `index.ts`（純 re-export）已排除。
- `npm run verify` 是提交前的一鍵檢查。E2E 因為要跑瀏覽器，另外用 `npm run e2e`。
- Vite 的 `base` 由 CI 用 `VITE_BASE` 環境變數注入為 `/<repo-name>/`；
  本機開發是 `/`。**不要在 `vite.config.ts` 寫死 repo 名稱。**
- 路由尚未加入。Phase 4 加路由時**必須用 `HashRouter`**，
  因為 GitHub Pages 不支援 SPA 的 history fallback。

---

## Phase 1 — Domain：金額與時間 ✅ DONE

**目標：** 建立 `Money` 與 `Week` 兩個純模組。全部是純函式，**不碰任何 UI**。

這是整個專案最重要的 phase。後面所有計算都建立在這兩塊上，
一旦有 bug，會污染每一個畫面。

### 要做的事

1. **`src/domain/currency.ts`**
   - 幣別代碼與小數位數對照表（至少涵蓋 TWD=2, JPY=0, USD=2, EUR=2, KRW=0, CNY=2, HKD=2, GBP=2, AUD=2, SGD=2, THB=2, VND=0, MYR=2, PHP=2, IDR=2, INR=2, CAD=2, CHF=2, NZD=2, MOP=2）
   - `decimalsFor(code)`、`isKnownCurrency(code)`、`symbolFor(code)`

2. **`src/domain/money.ts`**
   - 以整數最小單位儲存（見 SPEC.md P2）
   - `Money.of(minorUnits, currency)`、`parse(input, currency)`、`format(money)`
   - `add`、`subtract`、`sum`、`percentOf`
   - 跨幣別運算必須拋錯

3. **`src/domain/week.ts`**
   - `weekRangeOf(date, weekStartDay)` → `{ start: IsoDate, end: IsoDate }`
   - `groupByWeek(items, getDate, weekStartDay)`
   - `weekStartDay` 型別為 `0 | 1 | 2 | 3 | 4 | 5 | 6`（0 = 週日）

### 對應測案

`TESTCASES.md` 的 **T1.1 ~ T1.3**（Money）與 **T2.1 ~ T2.5**（Week），共約 45 個測案。

**T2.4.5 是 property-based 測試**（1000 次隨機），
不需要引入 fast-check，用 `for` 迴圈加簡單亂數即可。

### 驗收條件

- [ ] T1.x、T2.x 全數通過，測試名稱含測案編號
- [ ] `npm run verify` 通過，domain 覆蓋率 ≥ 90%
- [ ] `src/domain/` 仍然零外部依賴
- [ ] UI 維持 Phase 0 的樣子（**這個 phase 不動畫面**）

### ⚠️ 已知陷阱

- **T2.4.6（DST）是最容易掛的一題。** 不要用 `new Date(y, m, d)` 做日期加減，
  那會走本地時區。用 `Date.UTC` 或直接對 `YYYY-MM-DD` 字串做運算。
- **T1.3.5（浮點誤差）** 是在驗證 P2 有沒有被遵守。
  若你在任何地方用了 `parseFloat` 再乘 100，這題會掛。
  正確做法是對字串做整數解析。
- `percentOf` 分母為 0 時必須回傳 `0`，不是 `NaN`（T1.3.7）。

### 交接筆記

**產出：** `src/domain/currency.ts`、`src/domain/money.ts`、`src/domain/week.ts`，
共 54 個新測試（T1.1~T1.3、T2.1~T2.5 全數涵蓋），domain 覆蓋率 97.87%（門檻 90%）。
`npm run verify` 與 `npm run e2e` 皆綠燈（E2E 沿用 Phase 0 的 smoke test，本 phase 未動 UI）。

**API 設計決策：**
- `Money` 是純資料物件 `{ amount: number, currency: CurrencyCode }`，**不是 class**。
  `Money.of(amount, currency)` 是唯一的建構入口（掛在 `Money` 這個 const 物件上），
  其餘運算（`parse`、`format`、`add`、`subtract`、`sum`、`percentOf`）都是自由函式，
  吃 `Money` 純值、吐 `Money` 純值 —— 沒有方法鏈（不是 `money.add(...)`）。
  Phase 2 若要在 `Wallet`/`Transaction` 用到金額運算，請 import 這些自由函式。
- `sum(monies, currency)` 的 `currency` 參數是**必填**，即使陣列不為空也要傳，
  用意是讓「空陣列該回傳什麼幣別的 0」永遠有明確答案，也順便驗證陣列內每筆幣別一致。
- `percentOf(part, whole)` 我額外加了「幣別必須相同」的檢查（TESTCASES 沒明講，
  但比照 `add`/`subtract` 禁止跨幣運算的精神）。分母為 0 回傳 `0`。
- `groupByWeek` 回傳的分組陣列是**組間依週首倒序**（最新的週在前），
  組內依日期**正序**。這個順序是我從 T2.5.1 的敘述反推的設計，Phase 2/4 若要疊加
  「同一週內同一天再依 `createdAt` 排序」，可以在 `groupByWeek` 呼叫端自行二次排序，
  不需要改 `week.ts` 本身。
- 日期運算全部走 `Date.UTC` + 字串 regex 手動拆解 `YYYY-MM-DD`，
  刻意不用 `date.split('-').map(Number)` 解構（在 `noUncheckedIndexedAccess` 下型別會是
  `number | undefined`，過不了 typecheck）。Phase 2 若還要寫日期相關函式，
  照抄 `week.ts` 裡 `ISO_DATE_RE` 的手法即可。

**已知但不影響 Phase 1 驗收的小坑（留給 Phase 2 注意）：**
- `Money.of` / `parse` 對未知幣別代碼一律拋錯（T1.1.6、對照 `currency.ts` 的固定 20 種表）。
  但 SPEC.md §7 D6 說 Wallet 的幣別「內建 20 種 + 使用者自訂代碼」都要能設。
  這兩者目前**不衝突**（T1.1.6 測的是 Money 層行為，沒說 Wallet 層不能有自訂幣別），
  但 Phase 2 設計 `Wallet` 時要想清楚：自訂幣別代碼要怎麼決定小數位數？
  可能需要在 `currency.ts` 加一個 `registerCurrency` 之類的擴充點，或是要求
  使用者在建立自訂幣別時一併輸入小數位數。這不算「規格矛盾」，先寫下來提醒。
- `npm run e2e` 在本機驗證時，容器內建瀏覽器版本（`/opt/pw-browsers`，Chromium 1194）
  與 `@playwright/test` 目前釘的版本（1.49.1 → 期待 Chromium 1234）有落差，
  直接 `npm run e2e` 會找不到 executable。CI 上因為會自己 `playwright install`，
  版本會對齊，不受影響；本機/沙盒驗證時用一個**未提交**的 `playwright.local.config.ts`
  加 `launchOptions.executablePath: '/opt/pw-browsers/chromium'` 繞過即可，
  驗完就刪掉，不要把這個 workaround 提交進 repo。

**沒有需要人類決策的事項** —— T1.x / T2.x 測案與規格完全一致，沒有矛盾或缺漏。

---

## Phase 2 — Domain：實體與預算計算 ✅ DONE

實作 `Wallet` / `Transaction` / `Category` 型別與驗證，以及
`calculateWeeklyBalance`、`calculateTotalBalance`、`summarizeByCategory`。

對應測案：**T3.1 ~ T3.5**

關鍵：SPEC.md 決策 **D1 — 預算餘額只計算支出，不扣除收入**。

### 驗收條件

- [x] T3.1 ~ T3.5 全數通過，測試名稱含測案編號
- [x] `npm run verify` 通過，domain 覆蓋率 98.69%（門檻 90%）
- [x] `npm run e2e` 通過（本 phase 未動 UI，沿用 Phase 0 smoke test）
- [x] `src/domain/` 仍然零外部依賴

### 交接筆記

**產出：** `src/domain/wallet.ts`、`src/domain/transaction.ts`、`src/domain/category.ts`、
`src/domain/budget.ts`，共新增 44 個測試（T3.1~T3.5 全數涵蓋 27 個，另補 17 個
entity 驗證測試，非 TESTCASES 契約項目但遵循「可新增、不可刪減」原則）。
`npm run verify` 與 `npm run e2e` 皆綠燈。

**API 設計決策：**

- **`Wallet.budgetAmount: number | null`**——`budgetMode = 'none'` 時必須是 `null`，
  `'weekly'` / `'total'` 時必須是非負整數。`validateWallet` 強制這條規則。
- **`Transaction.categoryId: string | null`**——這是這個 phase 最重要的設計決策。
  SPEC.md §3.3 說「刪除有交易的分類時，交易轉移到『未分類』」，但
  `summarizeByCategory(transactions)` 的簽章只有一個參數（照 SPEC.md §6 Phase 2
  段落原文），沒有分類清單可供比對「這個 categoryId 是否還存在」。
  因此我讓 `categoryId` 型別本身允許 `null` 代表「未分類」，
  T3.5.3 的測試直接建構 `categoryId: null` 的交易來模擬「分類已被刪除」後的狀態。
  **這意味著實際的『刪除分類 → 交易的 categoryId 改成 null』這個轉換動作，
  要留給 Phase 3（persistence）在刪除分類的 repository 操作裡完成**，
  domain 層本身不做這個轉換（因為那需要知道「所有交易」與「分類是否存在」，
  屬於資料庫操作而非純函式）。Phase 3 寫刪除分類的邏輯時要記得處理這一步。
- **`summarizeByCategory` 回傳原始整數金額（`amount: number`），不是 `Money`。**
  原因：`Transaction` 本身不存幣別（D2），`summarizeByCategory` 簽章只收
  `transactions`，沒有 `currency` 參數可以建構 `Money`。所以假設呼叫端已經
  保證傳入的交易屬於同一幣別（例如只傳同一個錢包的交易——目前唯一會用到
  分類彙總的地方就是「單一錢包」的統計畫面，SPEC.md Phase 6 也是「本週／本月
  分類支出佔比」，沒有跨錢包彙總的用例）。這個假設沒有寫成 runtime 檢查，
  純粹是呼叫端責任。Phase 6 串接 UI 時記得只傳單一錢包的交易。
- **`calculateWeeklyBalance` / `calculateTotalBalance` 在 `budgetMode` 不符時回傳 `null`**
  （T3.3.1），而不是拋錯或回傳 0——呼叫端（UI）用 `null` 判斷是否要顯示餘額卡片。
  另外新增了一個 SPEC.md 沒有明講函式名稱、但 T3.3.2 明確需要的
  `calculateWeeklyExpenseTotal(wallet, transactions, weekStartDay, referenceDate)`，
  回傳 `Money`，**不受 `budgetMode` 限制**（`none` 模式也能查）。
  這是 SPEC §3.4「`none` 模式只顯示本週支出總額」的計算來源，Phase 5 串接主畫面時
  `none` 模式請呼叫這個函式，不要呼叫 `calculateWeeklyBalance`（會拿到 `null`）。
- 錢包隔離（T3.4）與幣別隔離不是靠呼叫端先過濾——`calculateWeeklyBalance` /
  `calculateTotalBalance` / `calculateWeeklyExpenseTotal` 內部都用
  `transactions.filter(t => t.walletId === wallet.id && t.type === 'expense')`
  自己過濾。呼叫端可以放心傳全部交易進去，不需要事先篩選。
  這也代表**目前不存在、也不應該存在**任何「跨錢包加總」的 API（T3.4.3）。
- `budget.ts` 的 `percentOf` 直接復用 Phase 1 的 `money.ts`，分母（budget）為 0 時
  回傳 `0`（T3.2.6），沿用 Phase 1 已經做好的邊界處理，沒有重新造輪子。

**已知但不影響本 phase 驗收的坑（留給後續 phase 注意）：**

- **自訂幣別（D6）尚未解決。** Phase 1 交接筆記就提過這件事，這個 phase
  沒有進一步解決，因為 T3.x 測案只用 TWD／JPY（兩者都是內建的 20 種幣別之一），
  沒有測案逼你處理自訂幣別。但 `calculateWeeklyBalance` / `calculateTotalBalance`
  內部呼叫 `Money.of(wallet.budgetAmount, wallet.currency)`，如果 `wallet.currency`
  是使用者自訂、不在 `currency.ts` 20 種清單內的代碼，會直接拋錯
  （`money.ts` 的 `assertKnownCurrency`）。**Phase 3／4 若要支援自訂幣別，
  必須先在 `currency.ts` 解決「自訂幣別的小數位數怎麼決定」，否則自訂幣別的
  錢包一旦設了預算，餘額計算會直接炸掉。** 這不算規格矛盾（規格沒說要在
  Phase 2 解決），但這是目前最大的一顆未拆的坑，再往後拖會拖到 UI 層才爆炸，
  屆時除錯成本更高。
- `validateWallet` / `validateTransaction` / `validateCategory` 是我主動加的，
  TESTCASES.md 沒有對應編號的測案（只有 TASKS.md 文字提到「型別與驗證規則」）。
  我補了測試但沒有假造 T 編號，測試名稱是描述性中文，不是 `Txx.x.x` 格式。
  這批驗證邏輯很簡的：只檢查「型別不變式」（金額正負、budgetMode 與
  budgetAmount 的搭配），**沒有做 UUID 格式驗證、沒有做 categoryId 參照完整性
  檢查**（因為那需要查資料庫，屬於 Phase 3 persistence 或 repository 層的責任）。
- `id` / `createdAt` / `updatedAt` 這三個欄位這個 phase 完全沒有處理產生邏輯
  （沒有 `crypto.randomUUID()`，也沒有時間戳產生函式）。理由：domain 層
  不該自己取「現在時間」或亂數（違反 CLAUDE.md「時間當參數傳入」的慣例，
  UUID 產生也是一種需要注入的外部能力）。**這些留給 Phase 3 的
  repository／persistence 層在寫入資料庫時產生**，domain 層的型別只描述
  「一個完整的實體長什麼樣子」，不負責造出它。

**沒有需要人類決策的事項** —— T3.x 測案與規格完全一致，沒有矛盾或缺漏。
唯一值得注意的是上面提到的「自訂幣別小數位數」這顆坑，但這不是矛盾，
是規格本來就沒細講、需要之後某個 phase 做設計決定的地方，先記錄不需要現在打斷。

---

## Phase 3 — 持久層與匯出匯入 ✅ DONE

Dexie schema + migration、Repository 介面（domain 定義、persistence 實作）、
匯出／匯入與 schema 驗證。

對應測案：**T4.1 ~ T4.2**

### 驗收條件

- [x] T4.1.x ~ T4.2.x 全數通過，測試名稱含測案編號
- [x] `npm run verify` 通過，domain 覆蓋率 96.1%（門檻 90%）
- [x] `npm run e2e` 通過（本 phase 未動 UI，沿用 Phase 0 smoke test；本機沙盒需用
      Phase 1 交接筆記提到的 `playwright.local.config.ts` workaround 驗證，驗完即刪除未提交）
- [x] `src/domain/` 仍然零外部依賴（`check:domain` 通過，12 個 domain 檔案）
- [ ] 部署後手動確認頁面正常（本 phase 未動 UI，沿用 Phase 0 畫面，未額外手動確認）

### 交接筆記

**產出：**
- `src/domain/settings.ts` — `Settings` 型別與 `DEFAULT_SETTINGS`（SPEC.md §3.5）。
- `src/domain/repository.ts` — `WalletRepository` / `TransactionRepository` /
  `CategoryRepository` / `SettingsRepository` / `Repositories` 介面（純型別，無執行邏輯）。
- `src/domain/backup.ts` — 備份資料的形狀、JSON 剖析、schema 驗證（含參照完整性）、
  merge 邏輯。刻意留在 domain 而不是 persistence，因為這些是「這包資料合不合法」
  的純判斷，不碰 IndexedDB，Android 版本也能原封不動複用。`JSON.parse` 是語言
  內建能力不是外部套件，所以沒有違反零依賴。
- `src/domain/wallet.ts` 新增 `LastWalletError` / `assertCanDeleteWallet`——
  「不可刪除最後一個錢包」這條 SPEC.md §3.1 規則本身是純業務邏輯，讓 persistence
  呼叫而不是寫死在 Dexie 程式碼裡。
- `src/domain/category.ts` 新增 `reassignDeletedCategory`——Phase 2 交接筆記
  提到的坑（分類刪除→交易轉移到未分類）在這個 phase 補上，是純函式。
- `src/persistence/db.ts` — `AppDatabase`（Dexie 子類別），schema v1
  （`wallets` / `transactions` / `categories` / `settingsTable` 四個 table），
  `on('populate')` hook 首次開啟時建立 11 個預設分類與預設設定（不建立錢包，
  建立第一個錢包是 Phase 4 首次啟動引導的責任）。
- `src/persistence/repositories.ts` — 四個 Dexie repository 實作，
  `createRepositories(db)` 工廠函式組成 `Repositories`。
- `src/persistence/backup-repository.ts` — `createBackupRepository(db)`，
  `exportData` / `importReplace` / `importMerge`。驗證永遠在任何 DB 寫入之前
  完成，所以匯入失敗時保證資料庫還沒被動過，天然滿足 T4.2.3 的原子性，不需要
  額外的 rollback。
- 共新增 34 個測試（domain 23 個：settings 3、backup 17、wallet +3、category +4；
  persistence 11 個），T4.1.1~T4.1.6、T4.2.1~T4.2.8 全數涵蓋。

**API 設計決策：**

- **Repository 的 `add` / `update` 接收「完整的」domain 實體**（含 `id` /
  `createdAt` / `updatedAt`），不在 repository 內產生這些欄位。Phase 2 交接筆記
  原本建議「留給 Phase 3 的 repository 在寫入時產生」，這個 phase 改了主意：
  產生 `id`（`crypto.randomUUID()`）與時間戳的呼叫端，之後在 Phase 4 本來就需要
  「現在時間」來處理 SPEC.md §3.2 的日期預設值（今天），把產生邏輯放在 repository
  反而要多繞一層、還要幫 repository 額外做「now 要用參數注入」的介面設計。
  現在的 repository 角色單純很多：原封不動存進去、原封不動讀出來。
  **Phase 4 寫「新增交易／錢包」的 use case 時，記得自己產生 `id` 與
  `createdAt`/`updatedAt`（用 `crypto.randomUUID()` 與注入的 `now: Date`）
  再呼叫 `repos.transactions.add(...)`。**
- **`Settings` 存成單例列**（`settingsTable`，固定 id `SETTINGS_ROW_ID`）。
  `SettingsRepository.get()` 在還沒有任何設定列時回傳 `DEFAULT_SETTINGS`
  （不拋錯），因為 app 第一次啟動、使用者還沒存過任何設定是正常狀態。
- **`mergeBackups` 對沒有 `updatedAt` 的實體（`Wallet` / `Category`）的處理**：
  SPEC.md §3.6 說 merge 衝突時「保留 `updatedAt` 較新者」，但目前只有
  `Transaction` 有 `updatedAt` 欄位，`Wallet` / `Category` 沒有。這不算規格矛盾
  （T4.2.5 / T4.2.6 的測案本身只用交易資料，沒有明確要求 Wallet/Category 的
  merge 行為），但確實是規格沒講清楚的地方，我做了一個實作決策：
  **id 衝突時，沒有 `updatedAt` 可比較的實體一律以匯入資料覆蓋現有資料。**
  這個決策已經寫進 `backup.ts` 的 `mergeById` 註解與 `backup.test.ts` 的測試。
  如果之後要幫 `Wallet` / `Category` 加 `updatedAt` 欄位讓 merge 語意完全一致，
  請注意這會改動 Phase 2 已經合併的型別，屬於破壞性變更，建議之後某個 phase
  一次做，不要臨時加。
- **匯出格式**：`serializeBackup` 用 `JSON.stringify(data, null, 2)`（人類可讀），
  但檔名產生（SPEC.md §3.6 的 `expense-backup-YYYYMMDD-HHmm.json`）與實際的
  瀏覽器下載（Blob + `<a download>`）**留給 Phase 7**（UI 层的匯出／匯入按鈕），
  這個 phase 只做到「給我一段文字，我存進 DB／從 DB 讀出一段文字」。
- **T4.1.5（schema migration）目前是骨架**，不是真的 v1→v2 升級——因為現在
  還只有 v1，沒有真正要升級的欄位。`tests/persistence/migration.test.ts` 用一個
  獨立的、測試專用的 Dexie 定義（不是 `AppDatabase`）示範「先用 v1 寫資料、
  再用一條 `.version(1)...version(2)` 的鏈重新開啟」資料仍然完整。**之後真的要
  加 v2 schema 時**：在 `src/persistence/db.ts` 的 `AppDatabase` 建構子裡接著
  `this.version(1)` 加一個 `.version(2).stores({...}).upgrade(tx => {...})`，
  並把這個測試骨架換成針對真實欄位轉換的斷言（例如新增欄位的預設值）。
- **`WalletRepository.remove` 與 `CategoryRepository.remove` 都用 Dexie 的
  `db.transaction('rw', ...)` 包起來**，確保「刪除錢包＋刪除其交易」與
  「刪除分類＋交易轉移未分類」在單一 IndexedDB transaction 內完成，不會有
  「刪了一半」的中間狀態。
- **T4.1.6（併發寫入同一筆交易）** 用 `Promise.all([repo.update(A), repo.update(B)])`
  模擬，斷言最終資料完整等於 A 或 B 其中一個（不會欄位混雜）。Dexie 的 `put`
  整筆覆蓋，IndexedDB 本身保證單一 record 的寫入是原子的，所以這題本質上是在
  驗證「我們沒有自己手滑做欄位級別的 merge」，而不是在測 IndexedDB 本身。

**已知但不影響本 phase 驗收的坑（留給後續 phase 注意）：**

- **自訂幣別小數位數（D6）仍未解決**——Phase 1、Phase 2 交接筆記都提過。
  這個 phase 的 `validateBackupData` 也一樣沒處理：如果匯入的錢包用了不在
  `currency.ts` 20 種內建清單的自訂幣別代碼，`validateWallet` 本身不會擋
  （它不檢查 currency 合法性），但只要那個錢包之後被拿去算預算餘額
  （`Money.of(wallet.budgetAmount, wallet.currency)`），就會在 `money.ts` 炸開。
  **建議在 Phase 4 設計「建立錢包」表單、或更早的某個 phase，先解決
  `currency.ts` 要不要開放 `registerCurrency` 之類的擴充點**，不然這顆坑會一路
  滾到使用者實際操作時才爆炸。
- `AppDatabase` 建構子的 `name` 參數預設是 `'expense-tracker'`，Phase 4 組裝
  真正的 app 時直接 `new AppDatabase()` 用預設值即可，不需要額外配置。
- Playwright 本機驗證的 executable 版本落差（Phase 1 交接筆記提過的坑）
  這次仍然存在：`npm run e2e` 在本機沙盒會找不到 Chromium 1234，需要用
  `playwright.local.config.ts`（未提交）指定 `executablePath` 到
  `/opt/pw-browsers/chromium` 才能跑，驗完即刪除。CI 環境不受影響。

**沒有需要人類決策的事項** —— T4.x 測案與規格完全一致，沒有矛盾或缺漏。
上面提到的「Wallet/Category merge 沒有 updatedAt 可比較」是規格沒講清楚的細節，
已用合理預設值解決並記錄，不是阻塞性問題；「自訂幣別小數位數」是延續前兩個
phase 就有的已知坑，同樣不阻塞本 phase 驗收，但建議不要再往後拖。

---

## Phase 4 — 基礎 UI：錢包與交易 CRUD ✅ DONE

錢包建立／切換／編輯／封存、交易列表與 CRUD、首次啟動引導。

對應測案：**E2E-1、E2E-2**

### 驗收條件

- [x] E2E-1、E2E-2 全數通過（Chromium + Mobile Chrome）
- [x] `npm run verify` 通過（`check:domain` → `lint` → `typecheck` → `test:cov` → `build`），
      domain 覆蓋率 96.11%（門檻 90%，本 phase 未新增 domain 測試，沿用 Phase 1~3 的覆蓋）
- [x] `npm run e2e` 通過（本機沙盒用 Phase 1 交接筆記提到的
      `playwright.local.config.ts` workaround 驗證，驗完已刪除、未提交）
- [x] `src/domain/` 仍然零外部依賴（`check:domain` 通過，12 個 domain 檔案）
- [x] 部署後手動確認頁面正常（本機用 `npm run build && npm run preview` + 手動
      Playwright 腳本額外走過一次「建立第二個錢包（JPY 總預算）→ 切換 → 封存」流程，
      驗完即刪除；CI 上的 GitHub Pages 部署仍照 Phase 0 既有流程自動跑）

### 交接筆記

**產出：**
- `src/app/repositories.ts` — 整個 app 唯一的 `AppDatabase` + `Repositories` 組裝點
  （單例，`new AppDatabase()` 用預設 db 名稱）。
- `src/app/store.ts` — Zustand store，是 domain 型別與 persistence repository 之間
  唯一的橋樑。`id`（`crypto.randomUUID()`）與 `createdAt`/`updatedAt`（`new Date().toISOString()`）
  在這裡產生——這是 Phase 3 交接筆記講好的分工，repository 只負責原封不動存取。
  `selectCurrentWallet(state)` 是選出「目前錢包」的邏輯：優先用
  `settings.defaultWalletId` 對應的未封存錢包，找不到就退回第一個未封存錢包。
- `src/ui/` 新增：`WalletForm`（建立/編輯共用，編輯模式用 `lockCurrency` 鎖住幣別，
  對應 SPEC.md §7 D3）、`TransactionForm`（新增/編輯共用）、`TransactionList`、
  `Home`（含 `BalanceCard`，依 `budgetMode` 切換顯示週餘額／總餘額／純支出總額）、
  `Wallets`（管理列表：切換/編輯/封存/刪除）、`WalletPages.tsx`、
  `TransactionPages.tsx`（route 參數讀取的薄包裝）。
- `src/app/App.tsx` 改為 `HashRouter` + 路由表（`/`、`/wallets`、`/wallets/new`、
  `/wallets/:id/edit`、`/transactions/new`、`/transactions/:id/edit`），
  App 掛載時呼叫 `store.load()` 從 repository 讀出全部資料。
- `src/domain/currency.ts` 新增 `KNOWN_CURRENCIES`（`CurrencyCode[]`）——
  純粹是既有 `CURRENCIES` 表的 key 清單，供 UI 的幣別下拉選單使用，
  沒有新增任何外部依賴或改變既有函式行為。
- 新增 `tests/e2e/wallet-transaction-crud.spec.ts`（E2E-1、E2E-2 全數涵蓋，
  測試名稱以測案編號開頭）。移除舊的 `tests/e2e/smoke.spec.ts` 對
  `data-testid="today"` 的斷言——那是 Phase 0 空白頁佔位用的元素，
  不是 TESTCASES.md 契約項目，這個 phase 開始畫面已經有真正內容，
  沒有理由保留它；`heading('記帳本')` 的斷言則保留並持續通過（現在是
  全域 header 的 `<h1>`）。

**設計決策：**

- **「首次啟動引導」沒有獨立的 `/onboarding` 路由**——`Home` 元件直接根據
  `wallets.length === 0` 決定要渲染 `WalletForm`（引導畫面）還是主畫面。
  SPEC.md §6 Phase 4 只說「首次啟動引導：建立第一個錢包」，沒有規定要不要
  獨立路由，這樣做可以少一層轉址判斷。E2E-1 直接 `page.goto('/')` 就會看到引導表單。
- **`createWallet` 永遠把新建的錢包設成 `settings.defaultWalletId`**（不論是
  第一個錢包還是後續新增的）。這代表「新增錢包」在 UX 上等同「新增並切換過去」。
  這不是 TESTCASES.md 明講的行為，是我的設計決策；手動驗證 E2E-4 情境
  （建立第二個錢包 → 應顯示該錢包畫面）時這個行為剛好對，如果 Phase 5
  要改成「新增後留在原錢包」，只要拿掉 `createWallet` 裡更新 `settings` 那段即可。
- **`switchWallet` 是 `await settings.update()` 完成後才更新記憶體狀態**——
  這代表「切換錢包」在 UI 上會有一次 await 的延遲（實務上 IndexedDB 寫入很快，
  感覺不出來）。手動驗證時發現：如果使用者切換後**立刻**做整頁重新整理
  （不是透過 SPA 導覽），理論上有極小機率切換沒寫入就被中斷——但這是
  IndexedDB 寫入延遲的一般性風險，不是這個 phase 特有的 bug，TESTCASES.md
  也沒有對應測案要求，沒有進一步處理。
- **交易表單的分類選單目前沒有「未分類」選項**——`categoryId: null`
  （未分類）只會透過「刪除有交易的分類」這個既有機制產生（Phase 3 的
  `reassignDeletedCategory`），使用者不能在新增/編輯交易時手動選「未分類」。
  這符合 SPEC.md §3.3 的語意（未分類是分類被刪除後的結果狀態，不是使用者
  可以主動選擇的分類），沒有測案要求相反行為。
- **金額輸入框吃的是使用者可讀字串（例如 `"120"`、`"3000.50"`），送出時用
  `domain/money.ts` 的 `parse(input, currency)` 轉成最小單位整數**——
  沿用 Phase 1 已經做好的解析與驗證（千分位、小數位數上限等），
  UI 層沒有自己另外寫一套金額解析邏輯。
- **`Wallets.tsx` 的刪除錢包會先跳原生 `window.confirm`（含交易筆數），
  刪除最後一個錢包時捕捉 `LastWalletError` 並用 `window.alert` 顯示**——
  SPEC.md §3.1「刪除錢包時需二次確認並提示交易筆數」用 `window.confirm`
  文字內嵌完成，沒有另外做自訂 Modal（Phase 7 若要做更精緻的確認 UI 可以在這裡加）。
- E2E-2 的刪除交易步驟原本斷言「`transaction-list` 這個 testid 元素不再包含
  已刪除交易的金額文字」，但 `TransactionList` 在清單為空時**不會渲染
  `data-testid="transaction-list"` 的 `<ul>`**（改渲染一段提示文字），
  導致 `expect(locator).not.toContainText()` 在元素不存在時直接判定失敗
  （而不是通過）。這是我在撰寫測試時發現的 Playwright 用法陷阱，不是產品
  程式碼的 bug——改成斷言「頁面上找不到该金額文字的節點」
  （`getByText('NT$200.00')` count 為 0）即可，測試意圖不變。

**已知但不影響本 phase 驗收的坑（留給 Phase 5 注意）：**

- **超支警示樣式（E2E-3）目前只做了最基本的版本**：`BalanceCard` 在
  `isOverBudget` 時把餘額文字改成紅色、並多顯示一行「已超支」文字，
  但 SPEC.md §3.4「警示圖示」還沒做（沒有 icon），也還沒有專門的 E2E 測試
  覆蓋這個情境（TASKS.md 把 E2E-3 排進 Phase 5）。Phase 5 要做 E2E-3 時，
  這段邏輯已經有基礎可以疊加，不需要重寫 `calculateWeeklyBalance` 的呼叫方式。
- **週起始日設定（E2E-5）完全還沒有 UI**——`Settings.weekStartDay` 目前
  只能在 DB 層看到預設值（週一），沒有任何畫面可以修改它。`BalanceCard`
  已經正確地從 `store.settings.weekStartDay` 讀值並傳給
  `calculateWeeklyBalance`/`calculateWeeklyExpenseTotal`，所以 Phase 5
  只需要加一個設定畫面呼叫 `repos.settings.update(...)` 並重新 `load()`
  （或直接更新 store 裡的 `settings`），不需要動這裡的計算邏輯。
- **`Wallets.tsx` 的「切換」按鈕目前只在未封存的錢包上顯示**，封存的錢包
  無法直接切換過去（要先「取消封存」）。這是刻意的（SPEC.md §3.1：
  「封存的錢包不顯示在主畫面」），但目前也連帶「不能切換過去」一起擋掉，
  沒有測案要求相反行為，先記錄以防之後被誤認為 bug。
- **分類管理 UI（Phase 6 範圍）完全沒做**——新增/編輯交易時分類清單是唯讀的
  （只能選現有分類，不能在交易表單裡臨時新增分類），這是刻意留給 Phase 6。
- 本機沙盒 Playwright executable 版本落差的 workaround
  （`playwright.local.config.ts`，未提交）這次也用到了，作法與 Phase 1/3
  交接筆記描述的完全相同，沒有新坑。

**沒有需要人類決策的事項** —— E2E-1、E2E-2 測案與規格完全一致，沒有矛盾或缺漏。
上面列的都是「規格沒細講、我做了合理預設值」的設計決策，已在此記錄，
不阻塞本 phase 驗收，Phase 5 若要調整可以直接改，不需要回頭問人類。

---

## Phase 5 — 預算與即時餘額 **NEXT**

預算設定（none / weekly / total）、主畫面餘額卡片、超支警示、週起始日設定。

對應測案：**E2E-3、E2E-4、E2E-5**

**這個 phase 結束後，app 才第一次具備完整價值。**

---

## Phase 6 — 分類與統計 ⬜ TODO

分類管理 CRUD、分類支出佔比、近 8 週趨勢圖。

對應測案：**E2E-6**（註：圖表本身不做像素比對，只驗證資料正確）

⚠️ 圖表函式庫不在 SPEC.md §5 的允許清單中。
若你認為需要，**停止並在 PR 中提出**；也可考慮用純 SVG 手繪，不引入套件。

---

## Phase 7 — PWA、備份與打磨 ⬜ TODO

PWA manifest + service worker、匯出／匯入 UI、備份提醒、深色模式、
空狀態／載入狀態／錯誤處理、無障礙檢查。

對應測案：**E2E-6、E2E-7**

---

## 待人類決策的問題

> Agent 發現規格矛盾或需要批准時，寫在這裡，並同時寫進 PR 描述。
> 人類回覆後會把該項移除。

_（目前無）_
