# 記帳本 — 專案規格書 v1

> 本文件是專案的唯一真實來源（single source of truth）。
> 所有 agent session 開始前必須先讀本文件與 `TASKS.md`。
> 修改本文件 = 修改契約，必須經人工確認。

---

## 1. 專案目標

一個**純本地、離線可用**的個人記帳 Web App，支援多錢包與多幣別，
可部署到 GitHub Pages，並為未來的 Android 版本保留可攜的業務邏輯與測試契約。

### 核心價值主張

「我這週還能花多少錢？」— 打開就能立刻看到答案。

---

## 2. 架構原則（不可違反）

這五條是硬約束。Agent 在任何 phase 都不得違反，違反視為該 PR 不合格。

### P1. 業務邏輯與框架完全分離

```
src/
  domain/        ← 純 TypeScript，零 import React / Dexie / 任何框架
    money.ts
    week.ts
    budget.ts
    wallet.ts
    transaction.ts
    category.ts
  persistence/   ← Dexie(IndexedDB) 實作，依賴 domain，不被 domain 依賴
  ui/            ← React 元件，只做渲染與事件轉發
  app/           ← 組裝層（DI、路由、狀態管理）
```

**驗證方式：** CI 內建一條 lint 規則 —
`src/domain/**` 內出現任何 `import` 外部套件（除了 TypeScript 內建型別）即 build 失敗。

理由：Android 版本無論走 PWA / Capacitor / React Native，`src/domain/` 都能原封不動搬走。

### P2. 金額一律以「最小單位整數」儲存

不得使用浮點數表示金額。TWD 100.50 存為 `10050`（分），JPY 1000 存為 `1000`（圓，0 位小數）。
所有運算在整數域完成，僅在顯示時格式化。

### P3. 純本地、零網路

App 執行期間不得發出任何網路請求。無後端、無帳號、無遙測、無匯率 API。
（CDN 字型也不行 — 字型必須 self-host，否則離線會壞。）

### P4. 每個 phase 結束時專案必須是可執行、可部署的

不允許「這個 phase 只寫一半、下個 phase 才能跑」。
每個 phase 的 PR 合併後，GitHub Pages 上的版本必須能正常開啟。

### P5. 測試先於實作

每個 phase 的 PR 必須包含該 phase 的測案，且測案必須先失敗、再由實作轉綠。
Domain 層測試覆蓋率門檻 **90%**（CI 強制）。

---

## 3. v1 功能範圍

### 3.1 錢包（Wallet）

| 屬性 | 說明 |
|---|---|
| `id` | UUID |
| `name` | 使用者自訂，如「日常」「日本旅遊 2026」 |
| `currency` | ISO 4217 代碼，如 `TWD`、`JPY`。**建立後不可修改** |
| `budgetMode` | `none` \| `weekly` \| `total` |
| `budgetAmount` | 整數最小單位；`budgetMode = none` 時為 `null` |
| `archived` | 布林，封存的錢包不顯示在主畫面 |

**規則：**
- 至少存在一個錢包；不可刪除最後一個錢包
- 錢包之間**不做任何幣別換算**，也**沒有總資產畫面**
- 刪除錢包時，其所有交易一併刪除（需二次確認，並提示交易筆數）

### 3.2 交易（Transaction）

| 屬性 | 說明 |
|---|---|
| `id` | UUID |
| `walletId` | 所屬錢包 |
| `type` | `expense` \| `income` |
| `amount` | 正整數，最小單位。方向由 `type` 決定，**amount 永遠為正** |
| `categoryId` | 分類 |
| `date` | `YYYY-MM-DD`（本地日期，不含時間、不含時區） |
| `note` | 選填，字串 |
| `createdAt` / `updatedAt` | ISO 時間戳，供衝突處理與排序 |

**規則：**
- 金額必須 > 0
- 日期允許未來日期（預先記帳），但預設為今天
- 交易的幣別隱含由錢包決定，不獨立儲存

### 3.3 分類（Category）

| 屬性 | 說明 |
|---|---|
| `id` | UUID |
| `name` | 使用者自訂 |
| `type` | `expense` \| `income` |
| `icon` | emoji 字串（v1 用 emoji，不做圖檔） |
| `isDefault` | 系統預設分類，可改名但不可刪除 |

**規則：**
- 分類**全域共用**，不隸屬於特定錢包
- 刪除有交易的分類時，交易轉移到「未分類」（不連帶刪除交易）
- 首次啟動建立預設分類：
  - 支出：🍜 飲食、🚗 交通、🏠 居住、🛒 購物、🎬 娛樂、💊 醫療、📦 其他
  - 收入：💰 薪資、🎁 獎金、📈 投資、📦 其他

### 3.4 預算與餘額（核心功能）

三種模式：

**`none`** — 不設預算。主畫面不顯示餘額卡片，只顯示本週支出總額。

**`weekly`** — 每週預算（適合日常錢包）
```
本週餘額 = 週預算 − 本週支出總和
```
- 「本週」由使用者設定的週起始日決定
- **只計算 `expense`，不扣除 `income`**（見 §7 決策 D1）
- 每週自動重置，不累積結轉

**`total`** — 總預算（適合旅遊錢包）
```
剩餘總預算 = 總預算 − 該錢包全部支出總和
```
- 不受週期影響，從錢包建立起累計
- 額外顯示：已用百分比

**共通：**
- 餘額可為負（超支），UI 以紅色與警示圖示呈現
- 餘額顯示必須**即時**：新增/編輯/刪除交易後同一畫面立刻更新，不需重整

### 3.5 設定（Settings）

| 設定 | 值 | 預設 |
|---|---|---|
| `weekStartDay` | `0`(週日) ~ `6`(週六) | `1`（週一） |
| `theme` | `light` \| `dark` \| `system` | `system` |
| `defaultWalletId` | 開啟 app 時預設顯示的錢包 | 第一個錢包 |

**`weekStartDay` 是全域設定**，變更後所有錢包的週分組即時重算（不改變任何交易資料）。

### 3.6 資料匯出 / 匯入

**必需功能，非選配。** 這是純本地架構下唯一的備份手段。

- **匯出**：單一 JSON 檔，含 schema version、所有錢包/交易/分類/設定。檔名 `expense-backup-YYYYMMDD-HHmm.json`
- **匯入**：兩種模式
  - `replace`：清空現有資料後匯入（需輸入確認字串）
  - `merge`：以 `id` 為鍵合併，衝突時保留 `updatedAt` 較新者
- 匯入前必須驗證 schema version 與資料完整性，任何一筆不合法則整批拒絕（原子性）
- App 首次啟動後每 7 天提醒一次備份

---

## 4. 非目標（v1 明確不做）

寫下來是為了防止 agent 自作主張擴張範圍。

- ❌ 帳號 / 登入 / 雲端同步
- ❌ 跨錢包幣別換算、總資產彙總
- ❌ 匯率查詢（自動或手動皆不做）
- ❌ 分類層級預算
- ❌ 定期／重複交易
- ❌ 發票掃描、OCR、拍照
- ❌ 複式記帳、轉帳、對帳
- ❌ 多人共享帳本
- ❌ 資料分析預測、AI 建議
- ❌ Android 原生實作 **（TBD，見 §8）**

---

## 5. 技術棧

| 用途 | 選擇 | 備註 |
|---|---|---|
| 建置 | Vite | `base: '/<repo>/'` for GitHub Pages |
| 框架 | React 18 + TypeScript (strict) | |
| 樣式 | Tailwind CSS | self-host 字型 |
| 路由 | React Router (**HashRouter**) | GitHub Pages SPA 相容性 |
| 本地資料 | Dexie (IndexedDB) | 封裝在 `persistence/` |
| 狀態 | Zustand | 輕量，易測 |
| 單元測試 | Vitest | |
| 元件測試 | React Testing Library | |
| E2E | Playwright | |
| CI/CD | GitHub Actions → GitHub Pages | |
| PWA | vite-plugin-pwa | manifest + offline service worker |

---

## 6. 開發階段（Phase）

每個 phase 目標 1–2 天，對應一個 PR，必須通過 CI 才能合併。

### Phase 0 — 地基 🔧 *（人工主導，不交給 agent）*

- 建立 GitHub repo
- Vite + React + TS + Tailwind 骨架
- Vitest / Playwright 設定
- ESLint 規則：**禁止 `src/domain/` import 外部套件**（P1 的執法者）
- GitHub Actions：lint → typecheck → unit → e2e → build → deploy Pages
- 撰寫 `CLAUDE.md`（agent 的常駐指令）與 `TASKS.md`（進度 lock file）
- Branch protection：main 需 PR + CI 綠燈

**驗收：** 一個空白頁面成功部署到 GitHub Pages，CI 全綠。

---

### Phase 1 — Domain 核心：金額與時間 💎

**這是整個專案最重要的一個 phase。** 全部是純函式，零 UI。

實作：
- `Money`：整數最小單位、幣別小數位表（TWD=2, JPY=0, USD=2…）、加減、格式化、解析
- `Week`：給定日期 + `weekStartDay` → 回傳該週的 `[start, end]` 區間；週分組

**驗收：** 測案 T1.x 全過，domain 覆蓋率 ≥ 90%，UI 仍為空白頁。

---

### Phase 2 — Domain：實體與預算計算 💎

實作 `Wallet` / `Transaction` / `Category` 的型別與驗證規則，以及：
- `calculateWeeklyBalance(wallet, transactions, weekStartDay, referenceDate)`
- `calculateTotalBalance(wallet, transactions)`
- `summarizeByCategory(transactions)`

**驗收：** 測案 T2.x 全過。

---

### Phase 3 — 持久層與匯出匯入 💾

- Dexie schema + migration 機制（schema version 從 1 開始）
- Repository 介面（domain 定義介面，persistence 實作 → 未來可換 SQLite）
- 匯出／匯入邏輯與 schema 驗證

**驗收：** 測案 T3.x 全過（用 fake-indexeddb 在 Node 環境測）。

---

### Phase 4 — 基礎 UI：錢包與交易 CRUD 🎨

- 錢包建立／切換／編輯／封存
- 交易列表（依日期分組）、新增、編輯、刪除
- 首次啟動引導：建立第一個錢包

**驗收：** 測案 E2E-1、E2E-2 全過，部署後手機瀏覽器可正常操作。

---

### Phase 5 — 預算與即時餘額 🎯

- 錢包預算設定（none / weekly / total）
- 主畫面餘額卡片，即時更新
- 超支警示樣式
- 週起始日設定

**驗收：** 測案 E2E-3、E2E-4 全過。**這時 app 已具備核心價值。**

---

### Phase 6 — 分類與統計 📊

- 分類管理 CRUD
- 本週／本月分類支出佔比（圓餅圖）
- 近 8 週支出趨勢（長條圖）

**驗收：** 測案 E2E-5 全過。

---

### Phase 7 — PWA、備份與打磨 ✨

- PWA manifest + service worker，Android Chrome 可「加到主畫面」
- 匯出／匯入 UI
- 備份提醒
- 深色模式
- 空狀態、載入狀態、錯誤處理
- 無障礙基本檢查

**驗收：** 測案 E2E-6 全過，Lighthouse PWA 檢核通過，飛航模式可正常使用。

---

## 7. 待確認的設計決策

這些是我在規格中做的判斷，若你不同意請在動工前提出。

| # | 決策 | 我的選擇 | 理由 |
|---|---|---|---|
| **D1** | 週餘額要不要扣掉收入？ | **不扣，只算支出** | 「這週還能花多少」的心智模型是支出預算。退款請用「負向處理」：直接編輯或刪除原支出，而非記一筆收入 |
| **D2** | 交易日期是否含時間？ | **只存日期** | 記帳本不需要時分秒，且避免時區地獄。排序用 `createdAt` |
| **D3** | 錢包幣別可否修改？ | **不可** | 已有交易時修改幣別語意不明。要換請建新錢包 |
| **D4** | 週預算未用完是否結轉？ | **不結轉** | 保持簡單。結轉是 v2 候選 |
| **D5** | 分類是全域還是錢包各自？ | **全域共用** | 避免旅遊錢包要重建一套分類 |
| **D6** | 支援哪些幣別？ | **內建常見 20 種 + 使用者自訂代碼** | 純本地無法查表，內建即可 |

---

## 8. Android 版本 — TBD

**v1 不做，但 v1 的架構必須為此保留彈性。**

未來決定架構時的三個候選：

| 路線 | Domain 複用 | 測案複用 | 額外成本 |
|---|---|---|---|
| PWA（已在 v1 完成） | 100% | 100% | 0 |
| Capacitor 包裝 | 100% | E2E 需換執行器 | 低 |
| React Native 重寫 | 100%（`src/domain/` 直接搬） | Domain 測案 100%，E2E 規格保留、腳本重寫 | 中高 |

**現在唯一要做的事：** 嚴守 §2 的 P1，確保 `src/domain/` 永遠是純的。
只要這條守住，三條路都通。

---

## 9. 給 Agent 的工作規則

1. 每次 session 開始：讀 `SPEC.md` + `TASKS.md` + `git log --oneline -20`
2. 一次只做 `TASKS.md` 中標記為 `NEXT` 的一個 phase
3. 先寫測案並確認失敗，再寫實作
4. 不得修改 `SPEC.md`；若發現規格矛盾或缺漏，在 PR 描述中提出並暫停該項
5. 不得引入 §5 表格以外的相依套件；如需新套件，在 PR 中說明理由並等待批准
6. 每個 PR 只對應一個 phase，開為 **draft PR**
7. CI 失敗時最多自動重試修復 3 次，仍失敗則在 PR 留言說明並停止
8. 完成後更新 `TASKS.md`，將下一個 phase 標為 `NEXT`
