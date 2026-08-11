/**
 * Money — 以整數最小單位表示金額（SPEC.md P2）。
 *
 * 所有運算在整數域完成，僅在 `format` 顯示時才轉換成含小數點的字串，
 * 藉此避免任何浮點誤差（TESTCASES.md T1.3.5）。
 */
import { decimalsFor, isKnownCurrency, symbolFor, type CurrencyCode } from './currency'

export interface Money {
  readonly amount: number
  readonly currency: CurrencyCode
}

function assertKnownCurrency(currency: string): void {
  if (!isKnownCurrency(currency)) {
    throw new RangeError(`未知的幣別代碼: ${currency}`)
  }
}

function of(amount: number, currency: string): Money {
  if (!Number.isInteger(amount)) {
    throw new RangeError(`金額最小單位必須是整數: ${amount}`)
  }
  assertKnownCurrency(currency)
  return { amount, currency }
}

export const Money = { of }

function assertSameCurrency(a: Money, b: Money): void {
  if (a.currency !== b.currency) {
    throw new RangeError(`幣別不符，禁止跨幣運算: ${a.currency} vs ${b.currency}`)
  }
}

/** 把千位數以逗號分隔，只作用於整數字串。 */
function groupThousands(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

export function format(money: Money): string {
  const decimals = decimalsFor(money.currency)
  const symbol = symbolFor(money.currency)
  const sign = money.amount < 0 ? '-' : ''
  const absAmount = Math.abs(money.amount)
  const factor = 10 ** decimals
  const whole = groupThousands(String(Math.trunc(absAmount / factor)))
  if (decimals === 0) {
    return `${sign}${symbol}${whole}`
  }
  const fraction = String(absAmount % factor).padStart(decimals, '0')
  return `${sign}${symbol}${whole}.${fraction}`
}

/** 解析使用者輸入的金額字串（容許千分位逗號），依幣別小數位驗證。 */
export function parse(input: string, currency: string): Money {
  assertKnownCurrency(currency)
  const decimals = decimalsFor(currency)
  const cleaned = input.trim().replace(/,/g, '')
  const match = /^(-?)(\d+)(?:\.(\d+))?$/.exec(cleaned)
  if (!match) {
    throw new RangeError(`無法解析的金額輸入: ${input}`)
  }
  const [, sign, intPart, fracPart = ''] = match
  if (fracPart.length > decimals) {
    throw new RangeError(`超過 ${currency} 允許的小數位數 (${decimals} 位): ${input}`)
  }
  const paddedFraction = fracPart.padEnd(decimals, '0')
  const amount = Number(intPart + paddedFraction) * (sign === '-' ? -1 : 1)
  return of(amount, currency)
}

export function add(a: Money, b: Money): Money {
  assertSameCurrency(a, b)
  return of(a.amount + b.amount, a.currency)
}

export function subtract(a: Money, b: Money): Money {
  assertSameCurrency(a, b)
  return of(a.amount - b.amount, a.currency)
}

export function sum(monies: Money[], currency: string): Money {
  assertKnownCurrency(currency)
  return monies.reduce((total, m) => add(total, m), of(0, currency))
}

/** part 佔 whole 的百分比，僅供顯示。whole 為 0 時回傳 0，不得為 NaN / Infinity。 */
export function percentOf(part: Money, whole: Money): number {
  assertSameCurrency(part, whole)
  if (whole.amount === 0) {
    return 0
  }
  return Math.round((part.amount / whole.amount) * 100 * 100) / 100
}
