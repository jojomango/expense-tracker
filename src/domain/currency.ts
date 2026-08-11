/**
 * 幣別代碼與小數位數對照表。
 *
 * SPEC.md §7 D6：v1 內建常見 20 種幣別；使用者自訂代碼留給
 * Wallet 層（Phase 2）決定如何處理，本模組本身只認得下列固定表。
 */
export type CurrencyCode = string

interface CurrencyInfo {
  readonly decimals: number
  readonly symbol: string
}

const CURRENCIES: Readonly<Record<string, CurrencyInfo>> = {
  TWD: { decimals: 2, symbol: 'NT$' },
  JPY: { decimals: 0, symbol: '¥' },
  USD: { decimals: 2, symbol: '$' },
  EUR: { decimals: 2, symbol: '€' },
  KRW: { decimals: 0, symbol: '₩' },
  CNY: { decimals: 2, symbol: 'CN¥' },
  HKD: { decimals: 2, symbol: 'HK$' },
  GBP: { decimals: 2, symbol: '£' },
  AUD: { decimals: 2, symbol: 'A$' },
  SGD: { decimals: 2, symbol: 'S$' },
  THB: { decimals: 2, symbol: '฿' },
  VND: { decimals: 0, symbol: '₫' },
  MYR: { decimals: 2, symbol: 'RM' },
  PHP: { decimals: 2, symbol: '₱' },
  IDR: { decimals: 2, symbol: 'Rp' },
  INR: { decimals: 2, symbol: '₹' },
  CAD: { decimals: 2, symbol: 'CA$' },
  CHF: { decimals: 2, symbol: 'CHF' },
  NZD: { decimals: 2, symbol: 'NZ$' },
  MOP: { decimals: 2, symbol: 'MOP$' },
}

export function isKnownCurrency(code: string): code is CurrencyCode {
  return Object.prototype.hasOwnProperty.call(CURRENCIES, code)
}

function infoFor(code: string): CurrencyInfo {
  const info = CURRENCIES[code]
  if (!info) {
    throw new RangeError(`未知的幣別代碼: ${code}`)
  }
  return info
}

export function decimalsFor(code: string): number {
  return infoFor(code).decimals
}

export function symbolFor(code: string): string {
  return infoFor(code).symbol
}
