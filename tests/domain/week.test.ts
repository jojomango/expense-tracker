import { describe, it, expect } from 'vitest'
import { weekRangeOf, groupByWeek, type WeekStartDay } from '../../src/domain/week'
import { toIsoDate, type IsoDate } from '../../src/domain/iso-date'

const d = (s: string): IsoDate => toIsoDate(s)

const ISO_PARTS_RE = /^(\d{4})-(\d{2})-(\d{2})$/

/** 把 IsoDate 轉為 UTC 毫秒，供測試驗證區間長度用（月份需轉為 0-index）。 */
const isoToUtcMs = (iso: IsoDate): number => {
  const match = ISO_PARTS_RE.exec(iso)
  if (!match) throw new Error(`unexpected IsoDate: ${iso}`)
  const [, y, m, day] = match
  return Date.UTC(Number(y), Number(m) - 1, Number(day))
}

describe('T2.1 — 週區間（weekStartDay = 1，週一起）', () => {
  it('T2.1.1 — 2026-08-11（二）→ 2026-08-10 ~ 2026-08-16', () => {
    expect(weekRangeOf(d('2026-08-11'), 1)).toEqual({ start: d('2026-08-10'), end: d('2026-08-16') })
  })

  it('T2.1.2 — 2026-08-10（一，週首邊界）→ 2026-08-10 ~ 2026-08-16', () => {
    expect(weekRangeOf(d('2026-08-10'), 1)).toEqual({ start: d('2026-08-10'), end: d('2026-08-16') })
  })

  it('T2.1.3 — 2026-08-16（日，週尾邊界）→ 2026-08-10 ~ 2026-08-16', () => {
    expect(weekRangeOf(d('2026-08-16'), 1)).toEqual({ start: d('2026-08-10'), end: d('2026-08-16') })
  })

  it('T2.1.4 — 2026-08-09（日）應歸屬前一週 → 2026-08-03 ~ 2026-08-09', () => {
    expect(weekRangeOf(d('2026-08-09'), 1)).toEqual({ start: d('2026-08-03'), end: d('2026-08-09') })
  })

  it('T2.1.5 — 2026-08-17（一）應歸屬下一週 → 2026-08-17 ~ 2026-08-23', () => {
    expect(weekRangeOf(d('2026-08-17'), 1)).toEqual({ start: d('2026-08-17'), end: d('2026-08-23') })
  })
})

describe('T2.2 — 週區間（weekStartDay = 0，週日起）', () => {
  it('T2.2.1 — 2026-08-11（二）→ 2026-08-09 ~ 2026-08-15', () => {
    expect(weekRangeOf(d('2026-08-11'), 0)).toEqual({ start: d('2026-08-09'), end: d('2026-08-15') })
  })

  it('T2.2.2 — 2026-08-09（日，週首）→ 2026-08-09 ~ 2026-08-15', () => {
    expect(weekRangeOf(d('2026-08-09'), 0)).toEqual({ start: d('2026-08-09'), end: d('2026-08-15') })
  })

  it('T2.2.3 — 2026-08-15（六，週尾）→ 2026-08-09 ~ 2026-08-15', () => {
    expect(weekRangeOf(d('2026-08-15'), 0)).toEqual({ start: d('2026-08-09'), end: d('2026-08-15') })
  })

  it('T2.2.4 — 2026-08-16（日）→ 2026-08-16 ~ 2026-08-22', () => {
    expect(weekRangeOf(d('2026-08-16'), 0)).toEqual({ start: d('2026-08-16'), end: d('2026-08-22') })
  })
})

describe('T2.3 — 週起始日全七種取值（基準日 2026-08-11，二）', () => {
  const cases: Array<[WeekStartDay, string]> = [
    [0, '2026-08-09'],
    [1, '2026-08-10'],
    [2, '2026-08-11'],
    [3, '2026-08-05'],
    [4, '2026-08-06'],
    [5, '2026-08-07'],
    [6, '2026-08-08'],
  ]

  for (const [weekStartDay, expectedStart] of cases) {
    it(`T2.3.${weekStartDay + 1} — weekStartDay=${weekStartDay} → 週首 ${expectedStart}`, () => {
      expect(weekRangeOf(d('2026-08-11'), weekStartDay).start).toBe(d(expectedStart))
    })
  }
})

describe('T2.4 — 跨界情境', () => {
  it('T2.4.1 — 跨月：2026-07-30（四），weekStart=1 → 2026-07-27 ~ 2026-08-02', () => {
    expect(weekRangeOf(d('2026-07-30'), 1)).toEqual({ start: d('2026-07-27'), end: d('2026-08-02') })
  })

  it('T2.4.2 — 跨年：2026-01-01（四），weekStart=1 → 2025-12-29 ~ 2026-01-04', () => {
    expect(weekRangeOf(d('2026-01-01'), 1)).toEqual({ start: d('2025-12-29'), end: d('2026-01-04') })
  })

  it('T2.4.3 — 閏年 2 月：2028-02-29（二），weekStart=1 → 2028-02-28 ~ 2028-03-05', () => {
    expect(weekRangeOf(d('2028-02-29'), 1)).toEqual({ start: d('2028-02-28'), end: d('2028-03-05') })
  })

  it('T2.4.4 — 同一日期、不同 weekStartDay 回傳不同區間，且皆包含該日期', () => {
    const date = d('2026-08-11')
    const rangeA = weekRangeOf(date, 1)
    const rangeB = weekRangeOf(date, 3)
    expect(rangeA).not.toEqual(rangeB)
    for (const range of [rangeA, rangeB]) {
      expect(range.start <= date && date <= range.end).toBe(true)
    }
  })

  it('T2.4.5 — property test：任意日期 × 任意 weekStartDay（1000 次隨機），區間長度恆為 7 天且日期恆落在區間內', () => {
    const randomIsoDate = (): IsoDate => {
      const year = 1970 + Math.floor(Math.random() * 100)
      const month = 1 + Math.floor(Math.random() * 12)
      const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()
      const day = 1 + Math.floor(Math.random() * daysInMonth)
      const pad = (n: number) => String(n).padStart(2, '0')
      return d(`${year}-${pad(month)}-${pad(day)}`)
    }

    for (let i = 0; i < 1000; i++) {
      const date = randomIsoDate()
      const weekStartDay = Math.floor(Math.random() * 7) as WeekStartDay
      const { start, end } = weekRangeOf(date, weekStartDay)
      expect((isoToUtcMs(end) - isoToUtcMs(start)) / 86_400_000).toBe(6)
      expect(start <= date && date <= end).toBe(true)
    }
  })

  it('T2.4.6 — 區間計算與時區無關，恆為 7 個曆日（不使用本地時區建構子）', () => {
    // 用一連串連續日期驗證區間穩定不受本地時區/DST 影響（皆以 UTC 內部運算）。
    const dates = ['2026-03-07', '2026-03-08', '2026-11-01', '2026-11-02']
    for (const iso of dates) {
      const { start, end } = weekRangeOf(d(iso), 1)
      expect((isoToUtcMs(end) - isoToUtcMs(start)) / 86_400_000).toBe(6)
    }
  })
})

describe('T2.5 — 週分組', () => {
  interface Tx {
    date: IsoDate
  }
  const tx = (iso: string): Tx => ({ date: d(iso) })
  const getDate = (t: Tx) => t.date

  it('T2.5.1 — 8 筆分屬 3 週的交易，weekStart=1，分為 3 組，組內依日期排序，組間依週首倒序', () => {
    const items = [
      tx('2026-08-11'),
      tx('2026-08-10'),
      tx('2026-08-04'),
      tx('2026-08-03'),
      tx('2026-08-17'),
      tx('2026-08-19'),
      tx('2026-08-12'),
      tx('2026-08-05'),
    ]
    const groups = groupByWeek(items, getDate, 1)
    expect(groups).toHaveLength(3)
    expect(groups.map((g) => g.start)).toEqual([d('2026-08-17'), d('2026-08-10'), d('2026-08-03')])
    expect(groups.at(1)?.items.map(getDate)).toEqual([d('2026-08-10'), d('2026-08-11'), d('2026-08-12')])
  })

  it('T2.5.2 — 空清單回傳空陣列，不拋錯', () => {
    expect(groupByWeek([], getDate, 1)).toEqual([])
  })

  it('T2.5.3 — 全部在同一天，回傳 1 組', () => {
    const items = [tx('2026-08-11'), tx('2026-08-11'), tx('2026-08-11')]
    expect(groupByWeek(items, getDate, 1)).toHaveLength(1)
  })

  it('T2.5.4 — 相同資料，weekStartDay 由 1 改為 0，分組結果改變', () => {
    const items = [tx('2026-08-09'), tx('2026-08-10')]
    const groupsWeekStart1 = groupByWeek(items, getDate, 1)
    const groupsWeekStart0 = groupByWeek(items, getDate, 0)
    expect(groupsWeekStart1).toHaveLength(2)
    expect(groupsWeekStart0).toHaveLength(1)
  })
})
