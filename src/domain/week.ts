/**
 * Week — 給定日期與週起始日，計算所屬週區間與週分組。
 *
 * TESTCASES.md T2.4.6：日期運算一律以 UTC 正午等效的整數天數處理，
 * 絕不使用本地時區的 `new Date(y, m, d)` 做加減比較，
 * 否則跨 DST 或跨時區時會產生錯誤的週界。
 */
import { toIsoDate, compareIsoDate, type IsoDate } from './iso-date'

export type WeekStartDay = 0 | 1 | 2 | 3 | 4 | 5 | 6

export interface WeekRange {
  readonly start: IsoDate
  readonly end: IsoDate
}

export interface WeekGroup<T> {
  readonly start: IsoDate
  readonly end: IsoDate
  readonly items: T[]
}

const MS_PER_DAY = 86_400_000

const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/

function isoToUtcMillis(date: IsoDate): number {
  const m = ISO_DATE_RE.exec(date)
  if (!m) {
    throw new RangeError(`不是合法的 ISO 日期 (YYYY-MM-DD): ${date}`)
  }
  const [, y, mo, d] = m
  return Date.UTC(Number(y), Number(mo) - 1, Number(d))
}

function utcMillisToIso(millis: number): IsoDate {
  const dt = new Date(millis)
  const y = String(dt.getUTCFullYear()).padStart(4, '0')
  const m = String(dt.getUTCMonth() + 1).padStart(2, '0')
  const d = String(dt.getUTCDate()).padStart(2, '0')
  return toIsoDate(`${y}-${m}-${d}`)
}

export function weekRangeOf(date: IsoDate, weekStartDay: WeekStartDay): WeekRange {
  const millis = isoToUtcMillis(date)
  const dayOfWeek = new Date(millis).getUTCDay()
  const daysSinceWeekStart = (dayOfWeek - weekStartDay + 7) % 7
  const startMillis = millis - daysSinceWeekStart * MS_PER_DAY
  const endMillis = startMillis + 6 * MS_PER_DAY
  return { start: utcMillisToIso(startMillis), end: utcMillisToIso(endMillis) }
}

export function groupByWeek<T>(
  items: readonly T[],
  getDate: (item: T) => IsoDate,
  weekStartDay: WeekStartDay,
): WeekGroup<T>[] {
  const groupsByStart = new Map<IsoDate, WeekGroup<T>>()

  for (const item of items) {
    const { start, end } = weekRangeOf(getDate(item), weekStartDay)
    let group = groupsByStart.get(start)
    if (!group) {
      group = { start, end, items: [] }
      groupsByStart.set(start, group)
    }
    group.items.push(item)
  }

  const groups = [...groupsByStart.values()]
  for (const group of groups) {
    group.items.sort((a, b) => compareIsoDate(getDate(a), getDate(b)))
  }
  groups.sort((a, b) => compareIsoDate(b.start, a.start))
  return groups
}
