# CLAUDE.md — Agent 常駐指令

> 這個檔案在每次 session 開始時自動載入。以下規則優先於你的預設行為。

## 這是什麼專案

一個純本地、離線可用的記帳 Web App。詳見 `SPEC.md`。

**本專案由 AI agent 自主開發，人類只做 review 與合併。**
因此以下規則不是建議，是硬約束。

---

## 每次 session 的開場程序

**在寫任何一行程式碼之前**，依序做完這四件事：

1. 讀 `SPEC.md`（規格契約）
2. 讀 `TESTCASES.md`（測試契約）
3. 讀 `TASKS.md`（進度狀態機）→ 找出標記為 `**NEXT**` 的 phase
4. 執行 `git log --oneline -20` 了解已完成的工作

然後**只做那一個 phase**。不多做，不少做。

---

## 三條絕對禁令

### 🚫 1. 不得修改 `SPEC.md` 或 `TESTCASES.md`

這兩份是人類簽署的契約。

若你發現規格有矛盾、缺漏或錯誤：
- **停止該項工作**
- 在 PR 描述的 `## 需要人類決策` 段落寫下問題
- 繼續做該 phase 中不受影響的部分

**永遠不要為了讓測試通過而修改測案。**
若某個測案看起來是錯的，那正是需要人類介入的訊號。

### 🚫 2. `src/domain/` 必須零外部依賴

不得 import React、Dexie、任何 npm 套件，不得使用 `window`、`document`、
`localStorage`、`indexedDB`、`fetch`。

需要外部能力時：在 domain 內**定義介面**，由外層注入實作。
需要現在時間時：**把 `Date` 當參數傳進來**，不要自己取。

`npm run check:domain` 會強制執行這條。它會在 CI 第一步就跑。

理由：未來要把 `src/domain/` 原封不動搬到 Android 版本。

### 🚫 3. 不得新增 `SPEC.md §5` 表格以外的相依套件

需要新套件時，在 PR 描述說明理由並**停止**，等待人類批准。
先試著用現有工具或手寫解決。

---

## 工作流程

### 開發順序（不可顛倒）

```
1. 讀該 phase 在 TESTCASES.md 中對應的測案
2. 寫測試 → 執行 → 確認「因為功能還沒實作」而失敗
3. 寫實作 → 執行 → 轉綠
4. npm run verify （完整本地驗證）
5. 更新 TASKS.md
6. 開 draft PR
```

**步驟 2 不可跳過。** 沒看過測試失敗，就不知道測試有沒有真的在測東西。

### 測試撰寫規則

- 測試名稱必須以測案編號開頭：`it('T2.1.4 — 週日應歸屬前一週', ...)`
- domain 測試**不得 mock 任何東西**。純函式不需要 mock；
  若你發現需要 mock，代表設計違反了禁令 2
- 時間相關測試必須注入固定的 `referenceDate`，**禁止 `new Date()`**
- 可以新增 `TESTCASES.md` 沒有的測案，但不得刪除或弱化既有測案

### 提交前必跑

```bash
npm run verify
```

等同於：`check:domain` → `lint` → `typecheck` → `test:cov` → `build`

E2E 另外跑：`npm run e2e`

**全部綠燈才能開 PR。**

---

## PR 規則

- **一個 PR 對應一個 phase**，不要合併多個 phase
- 開為 **draft PR**，標題格式：`Phase N — <phase 名稱>`
- 分支名稱使用 `claude/phase-N-<slug>`
- **絕對不要自行合併 PR**，也不要 push 到 `main`

### PR 描述模板

```markdown
## 這個 PR 做了什麼
（3 行以內）

## 對應的測案
- T1.1.x ~ T1.3.x（新增 N 個測試，全部通過）

## 驗證結果
- [ ] npm run verify 通過
- [ ] npm run e2e 通過
- [ ] domain 覆蓋率 XX%
- [ ] 部署後手動確認頁面正常

## 需要人類決策
（沒有就寫「無」。有的話務必列出，不要自己猜。）

## 我沒做的事
（該 phase 中刻意留給下一階段的部分）
```

---

## 卡住時該怎麼做

**不要硬幹。** 以下情況一律停止並在 PR 中說明：

| 情況 | 做法 |
|---|---|
| 測案與規格矛盾 | 停止，寫進「需要人類決策」 |
| 需要新套件 | 停止，說明理由 |
| CI 連續失敗 3 次 | 停止，貼出錯誤與你的分析 |
| 某個測案怎麼寫都很醜 | 可能是設計問題，停止並提出重構建議 |
| 這個 phase 比預期大很多 | 完成能完成的，其餘寫進「我沒做的事」 |

**誠實回報失敗，遠比假裝成功有價值。**
綠色的 CI 才是成功的證據，你的自我評估不是。

---

## 程式碼風格

- TypeScript strict 全開，**禁止 `any`**（ESLint 會擋）
- 金額一律用整數最小單位，**禁止浮點數**（見 SPEC.md P2）
- 日期一律用 `YYYY-MM-DD` 字串或 UTC 正午的 `Date`，
  **禁止 `new Date(y, m, d)` 做跨時區比較**
- 註解寫「為什麼」，不寫「做什麼」。程式碼應自我說明「做什麼」
- 面向使用者的文字一律繁體中文

## 目錄職責

```
src/domain/       純 TypeScript 業務邏輯。零依賴。← 最重要的資產
src/persistence/  Dexie / IndexedDB。實作 domain 定義的介面
src/ui/           React 元件。只渲染與轉發事件，不含業務邏輯
src/app/          組裝層：路由、狀態、依賴注入
tests/domain/     domain 單元測試（可攜）
tests/e2e/        Playwright 行為測試（規格可攜，腳本不可攜）
scripts/          建置與檢查工具
```

**判斷準則：** 如果一段邏輯在 Android 版本上也應該一模一樣，它就屬於 `domain/`。

---

## 完成一個 phase 後

1. 更新 `TASKS.md`：
   - 當前 phase 標記為 `✅ DONE`，附上 PR 連結
   - 下一個 phase 標記為 `**NEXT**`
2. 在 `TASKS.md` 的「交接筆記」寫下對下一個 phase 有用的資訊
   （你做了什麼設計決策、留了什麼坑、下一個人該注意什麼）

這份筆記是下一次 session 的你唯一能繼承的東西 —— **context 不會延續，git 才會。**
