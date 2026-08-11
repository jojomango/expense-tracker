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
| 1 | Domain：金額與時間 | **NEXT** | |
| 2 | Domain：實體與預算計算 | ⬜ TODO | |
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

## Phase 1 — Domain：金額與時間 **NEXT**

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

---

## Phase 2 — Domain：實體與預算計算 ⬜ TODO

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
