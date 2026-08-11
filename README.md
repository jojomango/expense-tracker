# 記帳本 Expense Tracker

純本地、離線可用的個人記帳 Web App。多錢包、多幣別、週預算與總預算。

**線上版本：** https://<你的帳號>.github.io/expense-tracker/

## 這個專案的特別之處

由 AI agent 自主開發，人類只做 review 與合併。四份文件構成完整契約：

| 檔案 | 角色 |
|---|---|
| `SPEC.md` | 規格契約 — agent 不得修改 |
| `TESTCASES.md` | 測試契約 — agent 不得修改，未來 Android 版本要複用 |
| `TASKS.md` | 進度狀態機 — agent 的跨 session 記憶體 |
| `CLAUDE.md` | agent 常駐行為準則 |

## 開發

```bash
npm install
npm run dev        # 開發伺服器
npm run verify     # 提交前完整檢查
npm run e2e        # E2E 測試
```

`npm run verify` = 架構純淨度 → lint → typecheck → 單元測試（含覆蓋率門檻）→ build

## 架構

```
src/domain/       純 TypeScript 業務邏輯，零依賴 ← 可攜到 Android
src/persistence/  Dexie / IndexedDB
src/ui/           React 元件
src/app/          組裝層
```

`src/domain/` 的純淨度由 `scripts/check-domain-purity.mjs` 在 CI 強制執行。
這是為了讓未來的 Android 版本能直接複用業務邏輯與測試。
