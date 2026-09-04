import { create } from 'zustand'

/**
 * 全域 toast（UI-SPEC.md §2.5、§3）：淡入 + 上移 8px 180ms，停留 2600ms 後自動消失，
 * 可選附一個動作鍵（例如刪除交易後的「還原」）。同時只顯示一則，新的會取代舊的。
 *
 * 純 UI 層的呈現狀態（不是業務邏輯，不碰 domain），所以直接用 zustand 存在這個模組裡，
 * 不透過 `app/store.ts`——那個 store 只放「domain 資料的橋接」。
 */

const TOAST_DURATION_MS = 2600

interface ToastAction {
  readonly label: string
  readonly onAction: () => void
}

interface ToastState {
  message: string | null
  action: ToastAction | null
}

let dismissTimer: ReturnType<typeof setTimeout> | undefined

const useToastStore = create<ToastState>(() => ({
  message: null,
  action: null,
}))

/** 顯示一則 toast，`action` 可選（例如刪除後的「還原」）。 */
export function showToast(message: string, action?: ToastAction): void {
  if (dismissTimer) clearTimeout(dismissTimer)
  useToastStore.setState({ message, action: action ?? null })
  dismissTimer = setTimeout(() => {
    useToastStore.setState({ message: null, action: null })
  }, TOAST_DURATION_MS)
}

function hideToast(): void {
  if (dismissTimer) clearTimeout(dismissTimer)
  useToastStore.setState({ message: null, action: null })
}

/** 掛一次在 app 根層級即可，所有畫面共用同一個 toast。 */
export default function ToastHost() {
  const message = useToastStore((s) => s.message)
  const action = useToastStore((s) => s.action)

  if (!message) return null

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="toast"
      className="fixed inset-x-0 bottom-24 z-50 mx-auto flex w-fit max-w-[90%] animate-toast-in items-center gap-3 rounded-toast bg-[#1c1c1ee6] px-4 py-2.5 text-body text-white shadow-toast backdrop-blur"
    >
      <span>{message}</span>
      {action && (
        <button
          type="button"
          className="font-semibold text-accent"
          onClick={() => {
            action.onAction()
            hideToast()
          }}
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
