/**
 * IsoDate — 本地曆日，格式 `YYYY-MM-DD`，不含時間與時區。
 *
 * SPEC.md D2：交易只儲存日期。
 * TESTCASES.md T2.4.6：所有日期運算必須與時區無關，
 * 因此本模組一律以字串或 UTC 正午的 Date 處理，
 * 絕不使用本地時區建構子做比較。
 */
export type IsoDate = string & { readonly __brand: 'IsoDate' }

const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/

/** 判斷字串是否為合法的 `YYYY-MM-DD`（含真實曆日檢查，會擋掉 2026-02-30）。 */
export function isIsoDate(value: unknown): value is IsoDate {
  if (typeof value !== 'string') return false
  const m = ISO_DATE_RE.exec(value)
  if (!m) return false
  const [, y, mo, d] = m
  const year = Number(y)
  const month = Number(mo)
  const day = Number(d)
  if (month < 1 || month > 12) return false
  if (day < 1 || day > 31) return false
  // 用 UTC 建構並回比，可同時擋掉 2026-02-30 這類不存在的日期
  const dt = new Date(Date.UTC(year, month - 1, day))
  return (
    dt.getUTCFullYear() === year &&
    dt.getUTCMonth() === month - 1 &&
    dt.getUTCDate() === day
  )
}

/** 將字串轉為 IsoDate，格式不合法則拋錯。 */
export function toIsoDate(value: string): IsoDate {
  if (!isIsoDate(value)) {
    throw new RangeError(`不是合法的 ISO 日期 (YYYY-MM-DD): ${value}`)
  }
  return value
}

/**
 * 取得某個時間點在「本地曆日」下的 IsoDate。
 *
 * 必須顯式傳入 `now`：TESTCASES.md 規定測試禁止依賴 `new Date()`。
 */
export function todayIso(now: Date): IsoDate {
  const y = String(now.getFullYear()).padStart(4, '0')
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}` as IsoDate
}

/** 比較兩個 IsoDate：a < b 回傳負數，相等回傳 0，a > b 回傳正數。 */
export function compareIsoDate(a: IsoDate, b: IsoDate): number {
  return a < b ? -1 : a > b ? 1 : 0
}
