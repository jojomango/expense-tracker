import { describe, it, expect } from 'vitest'
import { Money, parse, format, add, subtract, sum, percentOf, type Money as MoneyType } from '../../src/domain/money'

const TWD = (amount: number): MoneyType => Money.of(amount, 'TWD')
const JPY = (amount: number): MoneyType => Money.of(amount, 'JPY')

describe('T1.1 — 建構與驗證', () => {
  it('T1.1.1 — Money.of(10050, TWD) 內部值為 10050，顯示 NT$100.50', () => {
    const m = Money.of(10050, 'TWD')
    expect(m.amount).toBe(10050)
    expect(format(m)).toBe('NT$100.50')
  })

  it('T1.1.2 — Money.of(1000, JPY) 顯示 ¥1,000（JPY 0 位小數）', () => {
    expect(format(Money.of(1000, 'JPY'))).toBe('¥1,000')
  })

  it('T1.1.3 — Money.of(0, TWD) 合法，顯示 NT$0.00', () => {
    expect(format(Money.of(0, 'TWD'))).toBe('NT$0.00')
  })

  it('T1.1.4 — Money.of(-500, TWD) 合法，顯示 -NT$5.00', () => {
    expect(format(Money.of(-500, 'TWD'))).toBe('-NT$5.00')
  })

  it('T1.1.5 — Money.of(1.5, TWD) 拋錯：最小單位必須是整數', () => {
    expect(() => Money.of(1.5, 'TWD')).toThrow(RangeError)
  })

  it('T1.1.6 — Money.of(100, XXX) 拋錯：未知幣別代碼', () => {
    expect(() => Money.of(100, 'XXX')).toThrow(RangeError)
  })

  it('T1.1.7 — Money.of(Number.MAX_SAFE_INTEGER, TWD) 合法，不溢位', () => {
    const m = Money.of(Number.MAX_SAFE_INTEGER, 'TWD')
    expect(m.amount).toBe(Number.MAX_SAFE_INTEGER)
  })
})

describe('T1.2 — 解析使用者輸入（TWD）', () => {
  it('T1.2.1 — "100" 解析為 10000', () => {
    expect(parse('100', 'TWD').amount).toBe(10000)
  })

  it('T1.2.2 — "100.5" 解析為 10050', () => {
    expect(parse('100.5', 'TWD').amount).toBe(10050)
  })

  it('T1.2.3 — "100.50" 解析為 10050', () => {
    expect(parse('100.50', 'TWD').amount).toBe(10050)
  })

  it('T1.2.4 — "100.567" 拋錯：超過該幣別小數位', () => {
    expect(() => parse('100.567', 'TWD')).toThrow(RangeError)
  })

  it('T1.2.5 — "1,234.56" 容許千分位，解析為 123456', () => {
    expect(parse('1,234.56', 'TWD').amount).toBe(123456)
  })

  it('T1.2.6 — 空字串／非數字／單一負號拋錯', () => {
    expect(() => parse('', 'TWD')).toThrow(RangeError)
    expect(() => parse('abc', 'TWD')).toThrow(RangeError)
    expect(() => parse('-', 'TWD')).toThrow(RangeError)
  })

  it('T1.2.7 — "0" 解析為 0（Money 合法）', () => {
    expect(parse('0', 'TWD').amount).toBe(0)
  })

  it('T1.2.8 — "100.5"（JPY，0 位小數）拋錯', () => {
    expect(() => parse('100.5', 'JPY')).toThrow(RangeError)
  })
})

describe('T1.3 — 運算', () => {
  it('T1.3.1 — TWD(10050).add(TWD(2550)) = TWD(12600)', () => {
    expect(add(TWD(10050), TWD(2550))).toEqual(TWD(12600))
  })

  it('T1.3.2 — TWD(10000).subtract(TWD(15000)) = TWD(-5000)', () => {
    expect(subtract(TWD(10000), TWD(15000))).toEqual(TWD(-5000))
  })

  it('T1.3.3 — TWD(100).add(JPY(100)) 拋錯：幣別不符，禁止跨幣運算', () => {
    expect(() => add(TWD(100), JPY(100))).toThrow(RangeError)
  })

  it('T1.3.4 — sum([])（空陣列，指定 TWD）= TWD(0)', () => {
    expect(sum([], 'TWD')).toEqual(TWD(0))
  })

  it('T1.3.5 — 連續加 0.1 共 10 次（TWD）恰為 TWD(100)，無浮點誤差', () => {
    const tenCents = TWD(10) // 0.1 元 = 10 分
    const monies = Array.from({ length: 10 }, () => tenCents)
    expect(sum(monies, 'TWD')).toEqual(TWD(100))
  })

  it('T1.3.6 — TWD(10000).percentOf(TWD(30000)) = 33.33', () => {
    expect(percentOf(TWD(10000), TWD(30000))).toBe(33.33)
  })

  it('T1.3.7 — percentOf 分母為 0 回傳 0，不得為 NaN／Infinity', () => {
    expect(percentOf(TWD(1000), TWD(0))).toBe(0)
  })
})
