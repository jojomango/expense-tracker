# 分類固定色 — Dexie v1 → v2 migration

Phase 10 用。對應測案 T7.5、T7.6、T7.7。

## 為什麼需要

現況統計頁的顏色來自 `Stats.tsx` 的 `PIE_COLORS[index % 8]`,`index` 是「本期金額排序」的位次。
同一個分類這週是深藍、下週可能變綠,圖表沒有記憶點。顏色必須綁在分類本身。

這是整個改版唯一需要動到資料層的改動。

## 1. domain 型別

`src/domain/category.ts`:

```ts
export interface Category {
  readonly id: string
  readonly name: string
  readonly type: CategoryType
  readonly icon: string
  /** `#rrggbb`。分類的固定色,圖表與列表共用(UI-SPEC.md §2.2)。 */
  readonly color: string
  readonly isDefault: boolean
}

export interface DefaultCategorySeed {
  readonly name: string
  readonly type: CategoryType
  readonly icon: string
  readonly color: string
}

/** 使用者自建分類、或舊資料補色時的 fallback。 */
export const FALLBACK_CATEGORY_COLOR = '#7a7a80'

const HEX = /^#[0-9a-f]{6}$/i

export function validateCategory(category: Category): void {
  if (category.name.trim() === '') throw new RangeError('分類名稱不可為空')
  if (category.icon.trim() === '') throw new RangeError('分類 icon 不可為空')
  if (!HEX.test(category.color)) throw new RangeError('分類顏色必須是 #rrggbb')
}
```

種子色照 `UI-SPEC.md` §2.2 補進 `DEFAULT_EXPENSE_CATEGORIES` 與 `DEFAULT_INCOME_CATEGORIES`:

```ts
export const DEFAULT_EXPENSE_CATEGORIES: readonly DefaultCategorySeed[] = [
  { name: '飲食', type: 'expense', icon: '🍜', color: '#c1502e' },
  { name: '交通', type: 'expense', icon: '🚗', color: '#3f8f6a' },
  { name: '居住', type: 'expense', icon: '🏠', color: '#a8792f' },
  { name: '購物', type: 'expense', icon: '🛒', color: '#2f6f9f' },
  { name: '娛樂', type: 'expense', icon: '🎬', color: '#8a5fbf' },
  { name: '醫療', type: 'expense', icon: '💊', color: '#c04a6e' },
  { name: '其他', type: 'expense', icon: '📦', color: '#7a7a80' },
]

export const DEFAULT_INCOME_CATEGORIES: readonly DefaultCategorySeed[] = [
  { name: '薪資', type: 'income', icon: '💰', color: '#2f8f63' },
  { name: '獎金', type: 'income', icon: '🎁', color: '#c98b2e' },
  { name: '投資', type: 'income', icon: '📈', color: '#4a6fa8' },
  { name: '其他', type: 'income', icon: '📦', color: '#7a7a80' },
]
```

補一個純函式,給 migration 與備份匯入共用(放 `category.ts`,零依賴):

```ts
/** 依名稱 + type 找出預設種子色;找不到(使用者自建分類)回 fallback。 */
export function seedColorFor(name: string, type: CategoryType): string {
  const seed = DEFAULT_CATEGORIES.find((c) => c.name === name && c.type === type)
  return seed?.color ?? FALLBACK_CATEGORY_COLOR
}
```

## 2. Dexie schema

`src/persistence/db.ts`。**`color` 不需要索引**,所以 `.stores()` 的字串與 v1 相同 ——
但仍必須宣告 v2,才能掛 `upgrade()` 補既有資料。

```ts
this.version(1).stores({
  wallets: 'id, archived',
  transactions: 'id, walletId, categoryId, date',
  categories: 'id, type',
  settingsTable: 'id',
})

// v2:分類新增固定色(UI-SPEC.md §2.2)。color 不查詢,故索引不變;
// 這個 version 存在的唯一目的是補既有分類的 color 欄位。
this.version(2)
  .stores({
    wallets: 'id, archived',
    transactions: 'id, walletId, categoryId, date',
    categories: 'id, type',
    settingsTable: 'id',
  })
  .upgrade(async (tx) => {
    await tx
      .table<Category>('categories')
      .toCollection()
      .modify((c) => {
        if (typeof (c as { color?: string }).color !== 'string') {
          ;(c as { color: string }).color = seedColorFor(c.name, c.type)
        }
      })
  })
```

`seedDefaults()` 不用改 —— 它展開 `DEFAULT_CATEGORIES`,種子加了 `color` 就自動帶進去。

## 3. 備份匯入

`src/domain/backup.ts`:舊備份的分類物件沒有 `color`,匯入時補 `seedColorFor(name, type)`,
不要拋錯。匯出時 `color` 自然包含在分類物件裡。

## 4. UI

- `src/ui/Stats.tsx`:刪掉 `PIE_COLORS`、`PIE_COLORS[index % PIE_COLORS.length]`,改用 `category.color`。未分類用 `FALLBACK_CATEGORY_COLOR`
- `src/ui/TransactionList.tsx`:分類色塊底色 = `category.color` + 12%(light)/ 18%(dark)透明度
- `src/ui/CategoryForm.tsx`:加色票選擇,選項就是 §2.2 的 11 個色值。**不做自由選色**(避免使用者選到與背景同色)

## 5. 注意

- migration 測試照 `tests/persistence/migration.test.ts` 現有骨架寫,用 `fake-indexeddb`
- `modify()` 的 callback 直接改傳入物件,不要 return 新物件(Dexie 的 `modify` 語意)
- `Category` 是 `readonly` 介面,migration 內的型別逃逸是必要的;在該處寫註解說明原因,不要把介面改成可變
- 這個 phase 的 PR 描述請在「需要人類決策」寫明:**部署後既有使用者的 IndexedDB 會執行一次升級**,升級失敗時的行為(目前會落到 `ErrorBoundary`)是否需要更明確的提示
