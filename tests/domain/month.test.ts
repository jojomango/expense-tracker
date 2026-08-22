import { describe, it, expect } from 'vitest'
import { monthRangeOf } from '../../src/domain/month'
import { toIsoDate, type IsoDate } from '../../src/domain/iso-date'

const d = (s: string): IsoDate => toIsoDate(s)

describe('monthRangeOf — 月區間（Phase 6 新增，供本月分類佔比計算用，非 TESTCASES.md 契約項目）', () => {
  it('一般月份（8 月，31 天）', () => {
    expect(monthRangeOf(d('2026-08-11'))).toEqual({ start: d('2026-08-01'), end: d('2026-08-31') })
  })

  it('小月（4 月，30 天）', () => {
    expect(monthRangeOf(d('2026-04-15'))).toEqual({ start: d('2026-04-01'), end: d('2026-04-30') })
  })

  it('平年 2 月（28 天）', () => {
    expect(monthRangeOf(d('2026-02-15'))).toEqual({ start: d('2026-02-01'), end: d('2026-02-28') })
  })

  it('閏年 2 月（29 天）', () => {
    expect(monthRangeOf(d('2028-02-15'))).toEqual({ start: d('2028-02-01'), end: d('2028-02-29') })
  })

  it('月首當天本身即為區間起點', () => {
    expect(monthRangeOf(d('2026-08-01'))).toEqual({ start: d('2026-08-01'), end: d('2026-08-31') })
  })

  it('月尾當天本身即為區間終點', () => {
    expect(monthRangeOf(d('2026-08-31'))).toEqual({ start: d('2026-08-01'), end: d('2026-08-31') })
  })

  it('12 月（跨年邊界不受影響，仍在同一年內）', () => {
    expect(monthRangeOf(d('2026-12-25'))).toEqual({ start: d('2026-12-01'), end: d('2026-12-31') })
  })

  it('非法格式輸入時拋出 RangeError', () => {
    expect(() => monthRangeOf('not-a-date' as never)).toThrow(RangeError)
  })
})
