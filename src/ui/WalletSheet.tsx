import { Link } from 'react-router-dom'
import { useAppStore, selectCurrentWallet } from '../app/store'
import type { Wallet } from '../domain/wallet'
import type { Transaction } from '../domain/transaction'
import type { WeekStartDay } from '../domain/week'
import { calculateWeeklyBalance, calculateTotalBalance, calculateWeeklyExpenseTotal } from '../domain/budget'
import { format } from '../domain/money'
import { showToast } from './Toast'

/** 該錢包依 budgetMode 決定要顯示的「當期餘額」（UI-SPEC.md §7）。 */
function periodBalanceText(
  wallet: Wallet,
  transactions: Transaction[],
  weekStartDay: WeekStartDay,
  now: Date,
): string {
  if (wallet.budgetMode === 'weekly') {
    const result = calculateWeeklyBalance(wallet, transactions, weekStartDay, now)
    return result ? format(result.balance) : '—'
  }
  if (wallet.budgetMode === 'total') {
    const result = calculateTotalBalance(wallet, transactions)
    return result ? format(result.balance) : '—'
  }
  return format(calculateWeeklyExpenseTotal(wallet, transactions, weekStartDay, now))
}

export default function WalletSheet({ onClose }: { onClose: () => void }) {
  const wallets = useAppStore((s) => s.wallets)
  const transactions = useAppStore((s) => s.transactions)
  const weekStartDay = useAppStore((s) => s.settings.weekStartDay)
  const currentWallet = useAppStore(selectCurrentWallet)
  const switchWallet = useAppStore((s) => s.switchWallet)

  const active = wallets.filter((w) => !w.archived)
  const now = new Date()

  async function handleSwitch(id: string, name: string) {
    if (id !== currentWallet?.id) {
      await switchWallet(id)
      showToast(`已切換到 ${name}`)
    }
    onClose()
  }

  return (
    <div data-testid="wallet-sheet" className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 animate-backdrop-in bg-black/35"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="safe-bottom absolute inset-x-[10px] bottom-[10px] animate-sheet-in space-y-2">
        <div className="overflow-hidden rounded-[18px] bg-sheet shadow-toast backdrop-blur">
          <p className="border-b border-sep py-3 text-center text-caption text-fg2">切換錢包</p>
          <ul>
            {active.map((w) => (
              <li key={w.id}>
                <button
                  type="button"
                  data-testid="wallet-sheet-row"
                  onClick={() => void handleSwitch(w.id, w.name)}
                  className="flex w-full items-center justify-between border-b border-sep px-5 py-[15px] text-left last:border-b-0"
                >
                  <span>
                    <span className="block text-[17px] text-fg">{w.name}</span>
                    <span className="block text-caption text-fg2">
                      {w.currency} · {periodBalanceText(w, transactions, weekStartDay, now)}
                    </span>
                  </span>
                  {w.id === currentWallet?.id && (
                    <span data-testid="wallet-sheet-current-check" className="text-accent">
                      ✓
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
          <Link
            to="/wallets"
            onClick={onClose}
            className="block px-5 py-[15px] text-[17px] text-accent"
          >
            管理錢包…
          </Link>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-[18px] bg-sheet py-[15px] text-[17px] font-semibold text-fg backdrop-blur"
        >
          取消
        </button>
      </div>
    </div>
  )
}
