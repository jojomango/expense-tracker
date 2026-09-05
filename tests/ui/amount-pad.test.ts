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
})
