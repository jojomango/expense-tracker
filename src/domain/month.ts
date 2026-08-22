/**
 * Month — 給定日期，計算所屬西曆月份區間（Phase 6：本月分類支出佔比用）。
 *
 * 與 week.ts 同樣原則：一律以 UTC 曆日運算，不使用本地時區建構子做加減比較。
 */
import { toIsoDate, type IsoDate } from './iso-date'

export interface MonthRange {
  readonly start: IsoDate
  readonly end: IsoDate
}

const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/

export function monthRangeOf(date: IsoDate): MonthRange {
  const m = ISO_DATE_RE.exec(date)
  if (!m) {
    throw new RangeError(`不是合法的 ISO 日期 (YYYY-MM-DD): ${date}`)
  }
  const [, y, mo] = m
  const year = Number(y)
  const month = Number(mo)
  // day 0 of「下個月」等於「這個月」的最後一天。
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const pad = (n: number) => String(n).padStart(2, '0')
  return {
    start: toIsoDate(`${y}-${mo}-01`),
    end: toIsoDate(`${y}-${mo}-${pad(lastDay)}`),
  }
}
