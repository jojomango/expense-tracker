import { groupThousands } from '../domain/money'

/**
 * 記帳頁金額輸入的按鍵邏輯（UI-SPEC.md §5，TESTCASES.md T7.3）。
 *
 * 這不是 domain 層的業務規則——它描述的是「這個畫面的數字鍵台怎麼組字串」，
 * 不是 SPEC.md 定義的資料/業務規則，換成別的輸入元件（例如系統鍵盤）就不適用。
 * 但仍是不碰 DOM／React 的純函式，所以抽出來獨立可測，不必靠元件測試間接驗證。
 */
export const MAX_AMOUNT_DIGITS = 8

/**
 * 依現有字串與按下的鍵，回傳新的金額字串。
 *
 * `maxDecimals` 是小數點鍵支援後才加的參數（PR #11 review 討論結果，非 TESTCASES.md
 * T7.3 契約項目——T7.3 全部案例都不含小數點）：依錢包幣別的 `decimalsFor(currency)`
 * 決定小數點鍵按下去有沒有作用、以及小數位最多能輸入幾位。**預設值 0**，
 * 讓既有的 T7.3 測案（呼叫時只傳兩個參數）行為完全不變。
 *
 * 整數位與小數位的位數上限分開計算，互不影響：整數位仍是原本 T7.3 的 8 位上限；
 * 小數位上限是 `maxDecimals`。超過各自上限時整個忽略、字串不變。
 */
export function appendDigit(current: string, digit: string, maxDecimals = 0): string {
  if (digit === '.') {
    if (maxDecimals <= 0 || current.includes('.')) return current
    return current === '' ? '0.' : `${current}.`
  }

  const dotIndex = current.indexOf('.')
  if (dotIndex === -1) {
    if (current === '' && digit === '00') return '0'
    if (current === '0') return digit === '00' ? '0' : digit
    const next = current + digit
    return next.length > MAX_AMOUNT_DIGITS ? current : next
  }

  const fracPart = current.slice(dotIndex + 1)
  const remaining = maxDecimals - fracPart.length
  if (remaining <= 0) return current
  const toAppend = digit === '00' ? '00'.slice(0, remaining) : digit
  return current + toAppend
}

/** 刪除最後一個字元（數字或小數點本身）；空字串按下時維持空字串。 */
export function deleteDigit(current: string): string {
  return current.slice(0, -1)
}

/** 依目前輸入的金額字串，加上千分位與幣別符號（UI-SPEC.md §5：即時千分位）。
 * 千分位只套用在小數點以前的整數位，小數位原封不動顯示。 */
export function formatAmountDisplay(digits: string, symbol: string): string {
  if (digits === '') return `${symbol}0`
  const dotIndex = digits.indexOf('.')
  if (dotIndex === -1) return `${symbol}${groupThousands(digits)}`
  const intPart = digits.slice(0, dotIndex)
  const fracPart = digits.slice(dotIndex + 1)
  return `${symbol}${groupThousands(intPart === '' ? '0' : intPart)}.${fracPart}`
}
