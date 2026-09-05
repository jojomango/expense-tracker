/**
 * 記帳頁的數字鍵台（UI-SPEC.md §5）：3×4 網格。
 * 自製鍵台，不呼叫系統鍵盤（T8.1.7：全程 `document.activeElement` 不會是文字輸入框）。
 *
 * 鍵序依錢包幣別是否有小數位而不同（PR #11 review 討論結果）：
 * - `maxDecimals > 0`（例如 TWD/USD）：`1 2 3 / 4 5 6 / 7 8 9 / . 0 ⌫`
 * - `maxDecimals === 0`（例如 JPY/KRW/VND，沒有「分」）：維持原本的
 *   `1 2 3 / 4 5 6 / 7 8 9 / 00 0 ⌫`——小數點鍵按了也沒有意義，
 *   所以直接不出現在鍵台上（不是出現後停用，是那個格子換成 `00`）。
 */
interface AmountPadProps {
  maxDecimals: number
  onDigit: (digit: string) => void
  onDelete: () => void
}

export default function AmountPad({ maxDecimals, onDigit, onDelete }: AmountPadProps) {
  const bottomLeftKey = maxDecimals > 0 ? '.' : '00'
  const digitKeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', bottomLeftKey, '0']

  return (
    <div className="grid grid-cols-3 gap-2 bg-keypad px-[14px] py-2">
      {digitKeys.map((key) => (
        <button
          key={key}
          type="button"
          data-testid={`amount-key-${key}`}
          onClick={() => onDigit(key)}
          className="rounded-chip bg-key py-[15px] text-[25px] text-fg shadow-[0_1px_1px_rgba(0,0,0,0.12)]"
        >
          {key}
        </button>
      ))}
      <button
        type="button"
        data-testid="amount-key-back"
        aria-label="刪除一位數"
        onClick={onDelete}
        className="rounded-chip bg-key py-[15px] text-[25px] text-fg shadow-[0_1px_1px_rgba(0,0,0,0.12)]"
      >
        ⌫
      </button>
    </div>
  )
}
