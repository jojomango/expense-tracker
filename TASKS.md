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
| 2 | Domain：實體與預算計算 | **NEXT** | |
| 3 | 持久層與匯出匯入 | ⬜ TODO | |
| 4 | 基礎 UI：錢包與交易 CRUD | ⬜ TODO | |
| 5 | 預算與即時餘額 | ⬜ TODO | |
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

## Phase 2 — Domain：實體與預算計算 **NEXT**

實作 `Wallet` / `Transaction` / `Category` 型別與驗證，以及
`calculateWeeklyBalance`、`calculateTotalBalance`、`summarizeByCategory`。

對應測案：**T3.1 ~ T3.5**

關鍵：SPEC.md 決策 **D1 — 預算餘額只計算支出，不扣除收入**。

---

## Phase 3 — 持久層與匯出匯入 ⬜ TODO

Dexie schema + migration、Repository 介面（domain 定義、persistence 實作）、
匯出／匯入與 schema 驗證。

對應測案：**T4.1 ~ T4.2**（用 `fake-indexeddb` 在 Node 環境測）

---

## Phase 4 — 基礎 UI：錢包與交易 CRUD ⬜ TODO

錢包建立／切換／編輯／封存、交易列表與 CRUD、首次啟動引導。

對應測案：**E2E-1、E2E-2**

⚠️ 加路由時記得用 `HashRouter`。

---

## Phase 5 — 預算與即時餘額 ⬜ TODO

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
