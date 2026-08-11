import { describe, it, expect } from 'vitest'
import {
  isIsoDate,
  toIsoDate,
  todayIso,
  compareIsoDate,
} from '../../src/domain/iso-date'

describe('IsoDate', () => {
  it('P0.1 — 接受合法的 YYYY-MM-DD', () => {
    expect(isIsoDate('2026-08-11')).toBe(true)
    expect(isIsoDate('2028-02-29')).toBe(true) // 閏年
  })

  it('P0.2 — 拒絕不存在的曆日', () => {
    expect(isIsoDate('2026-02-30')).toBe(false)
    expect(isIsoDate('2026-13-01')).toBe(false)
    expect(isIsoDate('2027-02-29')).toBe(false) // 非閏年
  })

  it('P0.3 — 拒絕格式錯誤與非字串', () => {
    expect(isIsoDate('2026-8-11')).toBe(false)
    expect(isIsoDate('11/08/2026')).toBe(false)
    expect(isIsoDate('')).toBe(false)
    expect(isIsoDate(20260811)).toBe(false)
    expect(isIsoDate(null)).toBe(false)
  })

  it('P0.4 — toIsoDate 對非法輸入拋 RangeError', () => {
    expect(() => toIsoDate('2026-02-30')).toThrow(RangeError)
    expect(toIsoDate('2026-08-11')).toBe('2026-08-11')
  })

  it('P0.5 — todayIso 以注入的時間為準，且補零正確', () => {
    expect(todayIso(new Date(2026, 7, 11, 23, 59))).toBe('2026-08-11')
    expect(todayIso(new Date(2026, 0, 5, 0, 0))).toBe('2026-01-05')
  })

  it('P0.6 — compareIsoDate 可直接用於排序', () => {
    const dates = ['2026-08-11', '2025-12-31', '2026-01-01'].map(toIsoDate)
    expect([...dates].sort(compareIsoDate)).toEqual([
      '2025-12-31',
      '2026-01-01',
      '2026-08-11',
    ])
    expect(compareIsoDate(toIsoDate('2026-08-11'), toIsoDate('2026-08-11'))).toBe(0)
  })
})
