import { describe, it, expect } from 'vitest'
import { appendDigit, deleteDigit, formatAmountDisplay } from '../../src/ui/amount-pad'

/**
 * TESTCASES.md T7.3 — 記帳頁金額輸入的按鍵邏輯。
 * TESTCASES.md 建議這個純函式「放在 UI 層可測的模組」，不是 domain 層業務規則
 * （它描述的是這個特定畫面的鍵盤互動，不是 SPEC.md 的資料/業務規則），
 * 所以測試放在 tests/ui/，不計入 domain 覆蓋率門檻。
 */

describe('T7.3 — 金額輸入位數限制（appendDigit / deleteDigit）', () => {
  it('T7.3.1 — 空字串按 0 → 0', () => {
    expect(appendDigit('', '0')).toBe('0')
  })

  it('T7.3.2 — 0 按 5 → 5（去前導 0）', () => {
    expect(appendDigit('0', '5')).toBe('5')
  })

  it('T7.3.3 — 0 按 00 → 0（不產生 000）', () => {
    expect(appendDigit('0', '00')).toBe('0')
  })

  it('T7.3.4 — 已達 8 位時按 9 → 忽略，維持原字串', () => {
    expect(appendDigit('12345678', '9')).toBe('12345678')
  })

  it('T7.3.5 — 按 00 會超過 8 位上限 → 整個忽略', () => {
    expect(appendDigit('1234567', '00')).toBe('1234567')
  })

  it('T7.3.6 — 180 按 ⌫ → 18', () => {
    expect(deleteDigit('180')).toBe('18')
  })

  it('T7.3.7 — 空字串按 ⌫ → 仍為空字串', () => {
    expect(deleteDigit('')).toBe('')
  })
})

describe('formatAmountDisplay（記帳頁金額顯示，Phase 9 新增，非 TESTCASES.md 契約項目）', () => {
  it('空字串顯示為 0，帶幣別符號', () => {
    expect(formatAmountDisplay('', 'NT$')).toBe('NT$0')
  })

  it('三位以上數字加千分位逗號', () => {
    expect(formatAmountDisplay('12345678', 'NT$')).toBe('NT$12,345,678')
  })

  it('小數點後的數字不參與千分位分組', () => {
    expect(formatAmountDisplay('1234.5', 'NT$')).toBe('NT$1,234.5')
  })

  it('只輸入到小數點時仍顯示尾端的點', () => {
    expect(formatAmountDisplay('12.', 'NT$')).toBe('NT$12.')
  })
})

/**
 * 小數點鍵（appendDigit 第三個參數 maxDecimals）——PR #11 review 討論後補上：
 * 記帳頁改為支援小數輸入（幣別小數位數依 decimalsFor(currency) 決定），
 * 不是 TESTCASES.md T7.3 的契約項目（T7.3 全部案例都不含小數點），
 * 但沿用同一組純函式，所以測試放在同一個檔案。
 */
describe('appendDigit 的小數點處理（Phase 9 追加，非 TESTCASES.md 契約項目）', () => {
  it('maxDecimals 為 0（例如 JPY）時，按小數點沒有作用', () => {
    expect(appendDigit('12', '.', 0)).toBe('12')
  })

  it('省略 maxDecimals 時預設為 0，行為等同未支援小數（不影響既有 T7.3 呼叫端）', () => {
    expect(appendDigit('12', '.')).toBe('12')
  })

  it('空字串按小數點 → 0.', () => {
    expect(appendDigit('', '.', 2)).toBe('0.')
  })

  it('已經有小數點時再按一次小數點 → 不變', () => {
    expect(appendDigit('12.5', '.', 2)).toBe('12.5')
  })

  it('小數點後輸入位數依 maxDecimals 限制，超過則忽略', () => {
    expect(appendDigit('12.50', '9', 2)).toBe('12.50')
  })

  it('小數點後只剩 1 位空間時，按 00 只補 1 位', () => {
    expect(appendDigit('12.5', '00', 2)).toBe('12.50')
  })

  it('整數位數上限（8 位）不受小數點影響，各自獨立計算', () => {
    expect(appendDigit('12345678.', '9', 2)).toBe('12345678.9')
  })

  it('⌫ 可以刪掉小數點本身', () => {
    expect(deleteDigit('12.')).toBe('12')
  })
})
