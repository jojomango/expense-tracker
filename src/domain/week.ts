/**
 * Week — 給定日期與週起始日，計算所屬週區間與週分組。
 *
 * TESTCASES.md T2.4.6：日期運算一律以 UTC 正午等效的整數天數處理，
 * 絕不使用本地時區的 `new Date(y, m, d)` 做加減比較，
 * 否則跨 DST 或跨時區時會產生錯誤的週界。
 */
import { toIsoDate, todayIso, compareIsoDate, type IsoDate } from './iso-date'

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

/** 將 IsoDate 位移 `days` 天（可為負數），跨月／跨年／跨閏年皆以 UTC 曆日運算。 */
export function shiftIsoDate(date: IsoDate, days: number): IsoDate {
  return utcMillisToIso(isoToUtcMillis(date) + days * MS_PER_DAY)
}

/** `to` 與 `from` 相差的曆日數（`to` 較晚為正），UTC 曆日運算。 */
export function daysBetween(from: IsoDate, to: IsoDate): number {
  return Math.round((isoToUtcMillis(to) - isoToUtcMillis(from)) / MS_PER_DAY)
}

export function weekRangeOf(date: IsoDate, weekStartDay: WeekStartDay): WeekRange {
  const millis = isoToUtcMillis(date)
  const dayOfWeek = new Date(millis).getUTCDay()
  const daysSinceWeekStart = (dayOfWeek - weekStartDay + 7) % 7
  const startMillis = millis - daysSinceWeekStart * MS_PER_DAY
  const endMillis = startMillis + 6 * MS_PER_DAY
  return { start: utcMillisToIso(startMillis), end: utcMillisToIso(endMillis) }
}

/** `YYYY-MM-DD` → `M/D`（不補零、不含年份），供列表週分組標題使用（UI-SPEC.md §4.3）。 */
export function formatMonthDay(date: IsoDate): string {
  const m = ISO_DATE_RE.exec(date)
  if (!m) {
    throw new RangeError(`不是合法的 ISO 日期 (YYYY-MM-DD): ${date}`)
  }
  const [, , mo, d] = m
  return `${Number(mo)}/${Number(d)}`
}

/**
 * 週分組標題文案（UI-SPEC.md §4.3，TESTCASES.md T7.4）：本週／上週用人類語言標示，
 * 更早的分組只顯示日期範圍，一律 `M/D` 格式且不含年份、不輸出 ISO 字串。
 */
export function formatWeekGroupTitle(
  group: WeekRange,
  weekStartDay: WeekStartDay,
  referenceDate: Date,
): string {
  const currentWeekStart = weekRangeOf(todayIso(referenceDate), weekStartDay).start
  const lastWeekStart = shiftIsoDate(currentWeekStart, -7)
  const range = `${formatMonthDay(group.start)}–${formatMonthDay(group.end)}`
  if (group.start === currentWeekStart) return `本週 · ${range}`
  if (group.start === lastWeekStart) return `上週 · ${range}`
  return range
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

export interface DayGroup<T> {
  readonly date: IsoDate
  readonly items: T[]
}

/**
 * 依日期分組，組間依日期倒序（最新的日子在前）。使用者實際用 `total` 模式的旅行
 * 錢包記帳後回饋：週分組底下想再看到「這一天花了多少」，所以這裡補上跟
 * `groupByWeek` 平行的每日分組工具——純粹依日期分桶，不含任何 budgetMode 邏輯
 * （那是呼叫端的呈現選擇）。
 */
export function groupByDay<T>(items: readonly T[], getDate: (item: T) => IsoDate): DayGroup<T>[] {
  const groupsByDate = new Map<IsoDate, DayGroup<T>>()

  for (const item of items) {
    const date = getDate(item)
    let group = groupsByDate.get(date)
    if (!group) {
      group = { date, items: [] }
      groupsByDate.set(date, group)
    }
    group.items.push(item)
  }

  return [...groupsByDate.values()].sort((a, b) => compareIsoDate(b.date, a.date))
}

const WEEKDAY_LABELS = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'] as const

/** IsoDate 對應的星期幾中文標籤（例如 2026-09-08 → 「週二」），供每日分組標題使用。 */
export function weekdayLabel(date: IsoDate): string {
  const dayOfWeek = new Date(isoToUtcMillis(date)).getUTCDay()
  return WEEKDAY_LABELS[dayOfWeek] as string
}
