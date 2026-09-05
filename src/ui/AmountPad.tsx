/**
 * 記帳頁的數字鍵台（UI-SPEC.md §5）：3×4 網格，鍵序 `1 2 3 / 4 5 6 / 7 8 9 / 00 0 ⌫`。
 * 自製鍵台，不呼叫系統鍵盤（T8.1.7：全程 `document.activeElement` 不會是文字輸入框）。
 */
const DIGIT_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0'] as const

interface AmountPadProps {
  onDigit: (digit: string) => void
  onDelete: () => void
}

export default function AmountPad({ onDigit, onDelete }: AmountPadProps) {
  return (
    <div className="grid grid-cols-3 gap-2 bg-keypad px-[14px] py-2">
      {DIGIT_KEYS.map((key) => (
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
