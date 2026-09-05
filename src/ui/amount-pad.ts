import { groupThousands } from '../domain/money'

/**
 * 記帳頁金額輸入的按鍵邏輯（UI-SPEC.md §5，TESTCASES.md T7.3）。
 *
 * 這不是 domain 層的業務規則——它描述的是「這個畫面的數字鍵台怎麼組字串」，
 * 不是 SPEC.md 定義的資料/業務規則，換成別的輸入元件（例如系統鍵盤）就不適用。
 * 但仍是不碰 DOM／React 的純函式，所以抽出來獨立可測，不必靠元件測試間接驗證。
 */
export const MAX_AMOUNT_DIGITS = 8

/** 依現有字串與按下的鍵，回傳新的金額字串；超過位數上限時整個忽略、字串不變。 */
export function appendDigit(current: string, digit: string): string {
  if (current === '' && digit === '00') return '0'
  if (current === '0') {
    return digit === '00' ? '0' : digit
  }
  const next = current + digit
  return next.length > MAX_AMOUNT_DIGITS ? current : next
}

/** 刪除最後一位數字；空字串按下時維持空字串。 */
export function deleteDigit(current: string): string {
  return current.slice(0, -1)
}

/** 依目前輸入的整數位數字串，加上千分位與幣別符號（UI-SPEC.md §5：即時千分位）。 */
export function formatAmountDisplay(digits: string, symbol: string): string {
  return `${symbol}${groupThousands(digits === '' ? '0' : digits)}`
}
