# UI-SPEC.md — 介面契約

> 這份檔案與 `SPEC.md`、`TESTCASES.md` 同級:**agent 不得修改**。
> 發現規格矛盾時,停止該項工作並寫進 PR 的「需要人類決策」。
>
> 請在 `CLAUDE.md` 的開場程序加入第 5 步:「讀 `UI-SPEC.md`(介面契約)」。

`SPEC.md` 定義這個 app 做什麼,這份定義它長什麼樣子。所有數值都是確切值,不是建議值。
牴觸時以 `SPEC.md` 為準(例如 §3 的資料規則),但外觀一律以本檔為準。

---

## §1 設計原則

1. **手機優先。** 設計基準 390×844(iPhone 14)。桌機只需可用,不需最佳化。
2. **底部導覽。** 主要導覽在拇指區,不在標題列。所有可點目標 ≥ 44×44 px。
3. **一個畫面一個主角。** 首頁的主角是本週可用餘額,記帳頁的主角是金額,統計頁的主角是期間總額。
4. **不用底線文字連結當按鈕。** 次要動作用 pill、圖示鍵或列表列,不用 `underline`。
5. **數字用等寬數字。** 所有金額加 `tabular-nums`,避免跳動。
6. **深淺色同等對待。** 每個顏色都必須有 light / dark 兩個值,不接受只在其中一版可讀。

---

## §2 設計 token

寫進 `tailwind.config.js` 的 `theme.extend`,不要在元件裡寫死 hex。

### §2.1 顏色

| token | light | dark | 用途 |
|---|---|---|---|
| `bg` | `#f2f1ef` | `#000000` | 分組背景(頁面底色) |
| `card` | `#ffffff` | `#1c1c1e` | 卡片、列表列 |
| `fg` | `#111114` | `#ffffff` | 主要文字、金額 |
| `fg2` | `#6b6b70` | `#98989f` | 次要文字、標籤 |
| `fg3` | `#a3a3a8` | `#6c6c72` | 第三層文字、未選取的分頁圖示 |
| `sep` | `#e6e3df` | `#2c2c2e` | 分隔線、卡片內分隔 |
| `track` | `#ece9e6` | `#2c2c2e` | 進度條底、分段控制底、pill 底 |
| `barbg` | `rgba(242,241,239,0.86)` | `rgba(10,10,12,0.80)` | 狀態列與分頁列(加 `backdrop-blur`) |
| `sheet` | `rgba(255,255,255,0.96)` | `rgba(44,44,46,0.96)` | action sheet |
| `keypad` | `#e2dfda` | `#151517` | 數字鍵台背景 |
| `key` | `#ffffff` | `#3a3a3c` | 數字鍵 |
| `accent` | `#c1502e` | `#d9673f` | 強調色:主鍵、選取態、進度條、當週柱 |
| `danger` | `#d9463b` | `#e8564a` | 刪除動作、超支 |
| `income` | `#2f8f63` | `#3fa878` | 收入金額 |

dark 的 accent 比 light 亮一階,因為 `#c1502e` 在純黑上對比不足。

### §2.2 分類固定色

分類色綁在分類本身,不隨排序變動(現況的 `PIE_COLORS[index % 8]` 必須移除)。
`DEFAULT_CATEGORIES` 的種子色:

| 分類 | icon | color |
|---|---|---|
| 飲食 | 🍜 | `#c1502e` |
| 交通 | 🚗 | `#3f8f6a` |
| 居住 | 🏠 | `#a8792f` |
| 購物 | 🛒 | `#2f6f9f` |
| 娛樂 | 🎬 | `#8a5fbf` |
| 醫療 | 💊 | `#c04a6e` |
| 其他(支出) | 📦 | `#7a7a80` |
| 薪資 | 💰 | `#2f8f63` |
| 獎金 | 🎁 | `#c98b2e` |
| 投資 | 📈 | `#4a6fa8` |
| 其他(收入) | 📦 | `#7a7a80` |

未分類(`categoryId === null`)一律 `#7a7a80` + 📦。

**淡色底(tint)**:分類色 + 透明度 —— light `12%`、dark `18%`。用於分類圖示的方形色塊。
CSS 寫法:`background: color-mix(in srgb, var(--cat) 12%, transparent)`,或 hex 直接補 alpha(`#c1502e1f`)。

### §2.3 字級

系統字體堆疊,不載入 webfont:
`-apple-system, "SF Pro Text", "Helvetica Neue", system-ui, "PingFang TC", sans-serif`

| 名稱 | size / weight / letter-spacing | 用途 |
|---|---|---|
| `balance` | 46 / 600 / -0.03em | 首頁餘額 |
| `amount-input` | 54 / 600 / -0.035em | 記帳頁金額 |
| `title-lg` | 30 / 700 / -0.02em | 統計頁大標題 |
| `donut-total` | 27 / 600 / -0.02em | 圓環中心總額 |
| `nav-title` | 17 / 600 | 首頁錢包名稱 |
| `row-amount` | 17 / 500 | 列表金額 |
| `row-title` | 16 / 500 | 列表分類名 |
| `card-title` | 15 / 600 | 卡片標題 |
| `body` | 14 / 400 | 圖例、sheet 內文 |
| `caption` | 13 / 400 | 次要說明、列表副標 |
| `label` | 12 / 500 | 卡片小標籤 |
| `tab` | 10 / 400 | 分頁列文字 |

所有金額元素:`font-variant-numeric: tabular-nums`。

### §2.4 尺寸與間距

- 頁面左右內距 **20**;卡片內距 **22**;列表列內距 **11 / 14**(垂直 / 水平)
- 卡片圓角 **20**;列表群組圓角 **16**(第一列上圓角、最後一列下圓角);分類色塊 **12**;數字鍵 **12**;pill **999**;toast **14**
- 卡片陰影 `0 1px 2px rgba(0,0,0,0.05)`;FAB `0 6px 18px {accent}66`;toast `0 8px 24px rgba(0,0,0,0.25)`
- 狀態列高 **52**(含 `env(safe-area-inset-top)`);分頁列高 **84**(含 `env(safe-area-inset-bottom)`)
- 列表列最小高 **44**;分類圖示 **38×38**(列表)/ **50×50**(記帳頁網格);FAB **58×58**
- 進度條高 **8**(首頁)/ **4**(圖例);圓角 = 高度的一半

### §2.5 動畫

- 左滑位移:`transform 220ms cubic-bezier(0.2, 0.8, 0.2, 1)`,拖曳中不套 transition
- sheet 進場:由下滑入 `260ms cubic-bezier(0.2, 0.8, 0.2, 1)`,遮罩 `rgba(0,0,0,0.35)` 淡入
- toast:淡入 + 上移 8px,`180ms`,停留 **2600ms** 後自動消失
- 尊重 `prefers-reduced-motion: reduce` —— 全部改為即時切換

---

## §3 骨架

### §3.1 底部分頁列(取代標題列連結)

`src/ui/BottomTabBar.tsx`,固定在視窗底部,`bg-barbg` + `backdrop-blur`,上邊框 `sep`。

三個項目,由左至右:

1. **首頁** — 路由 `/`,圖示為 20×20 圓角方框(2px 邊框,`currentColor`)
2. **記帳** — 中央 FAB,58×58 圓形,`accent` 底、白色 `＋`(30px / weight 300),`margin-top: -20px` 讓它凸出分頁列,路由 `/transactions/new`
3. **統計** — 路由 `/stats`,圖示為三根高度 10 / 18 / 14 的 4px 直條

選取態文字與圖示為 `accent`,未選取 `fg3`。設定不進分頁列 —— 從首頁右上角進入(見 §4.1)。

分頁列在 `/transactions/new`、`/transactions/:id/edit` 以及任何表單頁**隱藏**。

### §4 首頁 `src/ui/Home.tsx`

#### §4.1 標題區

左側:錢包名稱(`nav-title`)+ 11px 的 `▾`,整塊是按鈕,點擊開錢包切換 sheet。
右側:`設定` 文字鍵,`accent`,15px。(現況的「分類 / 統計 / 設定」三個底線連結全部移除;分類管理移到設定頁內。)

#### §4.2 預算卡

`src/ui/BudgetCard.tsx`。`card` 底、圓角 20、內距 22。由上而下:

1. 標籤(`label`,`fg2`):`budgetMode === 'weekly'` → 「本週還可以花」;`'total'` → 「總預算還剩」;`'none'` → 「本週支出」
2. 金額(`balance`)。超支時整段文字改 `danger`,並在金額右側加 12px 的 `已超支` 標籤(`danger`,不用 emoji ⚠️)
3. 進度條:高 8、底 `track`、填色 `accent`(超支時 `danger`),寬度 = `usedPercent`(上限 100%)。`budgetMode === 'none'` 時不顯示
4. 一行兩端對齊(`caption`,`fg2`):左「已用 {usedText} / {budgetText}」、右「還有 {n} 天」
5. 上邊框 `sep` 的一行:左「日均可用」(`caption`,`fg2`)、右金額(15 / 500,`fg`)

「還有 n 天」與「日均可用」需要新的 domain 純函式,見 §7。

#### §4.3 交易列表 `src/ui/TransactionList.tsx`

依週分組,每組:

- 組標題(兩端對齊,下距 8):左「本週 · 8/31–9/6」(13 / 600,`fg2`)、右該組小計「-NT$4,080」(13,`fg3`,`tabular-nums`)
  - 標籤規則:本週 →「本週」、上週 →「上週」、更早 →「M/D–M/D」。日期一律 `M/D`,**不再輸出 ISO 字串**
- 群組容器:`card` 底、圓角 16、單一陰影;列與列之間 `sep` 分隔線(最後一列無)

每列(最小高 44):

- 左:38×38 圓角 12 的分類色塊(tint 底)+ 19px emoji
- 中:分類名(`row-title`)/ 副標(`caption`,`fg2`)= 「M/D」或「M/D · 備註」,單行溢出加 `…`
- 右:金額(`row-amount`),支出 `fg` 前綴 `-`,收入 `income` 前綴 `+`
- **不顯示編輯 / 刪除文字鍵**

互動:

- 點整列 → `/transactions/:id/edit`
- 左滑 → 露出右側 88px 寬的 `danger` 刪除鍵。用 Pointer Events 手寫:`pointerdown` 記起點,`pointermove` 算位移並 clamp 在 `-96…0`,`pointerup` 時位移 < -44 則停在 -88,否則歸零。同時只能有一列展開。列容器 `touch-action: pan-y` 讓垂直捲動不被吃掉
- 刪除後顯示 toast「已刪除 {分類} {金額}」,附「還原」文字鍵(5 秒內可還原)
- 空狀態:置中 emoji 📝 + 「這個錢包還沒有交易」+ 「記第一筆」pill 鍵(`accent`)

### §5 記帳頁 `src/ui/TransactionForm.tsx`

全螢幕,不顯示分頁列。由上而下:

1. 標題列:左 `取消`(16,`fg2`)、中支出/收入分段控制、右留白 32px 對稱
   - 分段控制:`track` 底、圓角 9、內距 2;選取項 `card` 底 + `0 1px 3px rgba(0,0,0,0.16)` 陰影
2. 金額區(置中,上下內距 26 / 20):
   - 上:「{錢包名} · {幣別}」(12,`fg2`,letter-spacing 0.04em)
   - 下:金額(`amount-input`)。未輸入時顯示 `NT$0` 且色為 `fg3`;有輸入時 `fg`(收入 `income`),即時千分位,幣別符號依錢包幣別與 `decimalsFor()`
3. 分類網格:4 欄、gap 10。每格 = 50×50 圓角 16 的 tint 色塊(22px emoji)+ 11px 名稱。
   選取態:色塊加 `box-shadow: 0 0 0 2.5px {分類色}`,名稱轉 `fg`。**取代原生 `<select>`**
4. 日期 pill 列(gap 8):`今天` / `昨天` / `選日期`。選取態 `accent` 底白字,未選取 `track` 底 `fg2` 字。
   `選日期` 開原生 date input。右側 `＋ 備註` pill,點擊展開單行輸入
5. 數字鍵台(貼底,`keypad` 底,內距 14 / 8):3×4 網格 gap 8。鍵序依錢包幣別是否有小數位而不同:
   - 幣別小數位數 > 0(例如 TWD、USD):`1 2 3 / 4 5 6 / 7 8 9 / . 0 ⌫`
   - 幣別小數位數為 0(例如 JPY、KRW、VND,沒有「分」):`1 2 3 / 4 5 6 / 7 8 9 / 00 0 ⌫`(小數點鍵沒有意義,直接不出現,那一格維持 `00`)

   鍵 = `key` 底、圓角 12、25px 字、`0 1px 1px rgba(0,0,0,0.12)`
6. 主鍵:整寬、圓角 14、內距 15、17 / 600、`accent` 底白字,文案 `記一筆`(編輯時 `儲存`)。金額為 0 時 `opacity: 0.4` 且不可點

輸入規則:整數位最多 8 位、小數位最多到該幣別的 `decimalsFor()` 位數,兩者上限互不影響;
前導 0 自動去除;小數點最多輸入一個;`⌫` 逐字刪除(含刪除小數點本身)。
成功後 `navigate('/')` 並顯示 toast「已記錄 {分類} {金額}」。

### §6 統計頁 `src/ui/Stats.tsx`

1. 大標題「統計」(`title-lg`)
2. 本週 / 本月分段控制(整寬,同 §5 樣式)
3. 圓環卡:
   - SVG 190×190,`viewBox="0 0 100 100"`,旋轉 -90°。底圈 `track`,`r=42`、`stroke-width=11`
   - 每個分類一個 `<circle>`,顏色 = 分類固定色,`stroke-dasharray` / `dashoffset` 依佔比累加
   - **圓環中心疊 HTML**(不是 SVG `<text>`):上「{本週|本月}支出」(12,`fg2`)、下期間總額(`donut-total`)
   - 圖例:每項一行 —— 色塊 10×10 圓角 3 + 「{emoji} {名稱}」(`body`),右側「{金額} · {百分比}」(`fg2`)。名稱與金額都 `white-space: nowrap`;下方 4px 進度條(分類色,寬度 = 百分比)
   - 空狀態:「這段期間沒有支出紀錄」(`fg3`)
4. 趨勢卡:
   - 標題行:左「近 8 週支出」(`card-title`)、右「比平均少 {金額}」(`caption`,`fg2`)
   - 其下一行「每週平均 {金額}」(12,`fg3`)
   - SVG `viewBox="0 0 320 100"`:8 根柱,`x = i*40 + 7`、寬 26、`rx=5`,高度 = `amount / max * 92`,底對齊 y=98。當週柱 `accent`,其餘 light `#d8d4cf` / dark `#3a3a3c`
   - 平均虛線:`<line>` 橫貫,`stroke-dasharray="3 4"`,顏色 `fg3`。**用 `style="stroke: …"` 而非 `stroke=` 屬性**(CSS 變數在 presentation attribute 裡不解析)
   - 週別標籤:**HTML `grid-cols-8`,每格置中**,10px,當週 `accent` 其餘 `fg3`。柱間距 40 與 8 等寬格對齊。**不要用 SVG `<text>`**(現況的 4 欄 grid 圖例必須移除)

### §7 錢包切換 sheet `src/ui/WalletSheet.tsx`

iOS action sheet:底部,左右內距 10,圓角 18,`sheet` 底 + `backdrop-blur`。

- 標題「切換錢包」(13,`fg2`,置中,下邊框 `sep`)
- 每個未封存錢包一列(內距 15 / 20):左「{名稱}」(17)/「{幣別} · {該錢包當期餘額}」(`caption`,`fg2`),右目前錢包顯示 `accent` 的 `✓`
- 末列「管理錢包…」(17,`accent`)→ `/wallets`
- 分離的「取消」鍵(圓角 18,17 / 600)
- 點遮罩或取消都關閉。切換後 toast「已切換到 {名稱}」

切換錢包後預算卡、交易列表、統計、幣別符號必須全部跟著換(依 `walletId` 過濾,不共用常數)。

---

## §8 需要新增的 domain 函式

放 `src/domain/budget.ts`,純函式、時間由參數注入,不得使用 `new Date()`:

```ts
/** 從 referenceDate 到本週結束(含當日)還有幾天。 */
export function daysLeftInWeek(
  weekStartDay: WeekStartDay,
  referenceDate: Date,
): number

/** 剩餘預算 ÷ 剩餘天數,向下取整到最小單位;剩餘 ≤ 0 時回傳 0。 */
export function dailyAllowance(
  remaining: Money,
  daysLeft: number,
): Money
```

其餘數字(`usedPercent`、`isOverBudget`、分類彙總、週趨勢)已存在,直接用,不要在 UI 層重算。

---

## §9 驗收

以下任一項不成立就不算完成:

- 標題列不存在任何 `underline` 的導覽連結
- 交易列表列上不存在「編輯」「刪除」文字鍵
- 分類選擇不使用原生 `<select>`
- 分類色在不同期間、不同排序下保持一致
- 週分組標題不出現 `YYYY-MM-DD` 格式
- 趨勢圖的 8 個週別標籤在畫面上可見,且水平位置對齊各自的柱子
- 深色模式下每個畫面的文字對比 ≥ 4.5:1
- 所有可點目標 ≥ 44×44 px
- `npm run verify` 與 `npm run e2e` 全綠
