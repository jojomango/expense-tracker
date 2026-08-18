import { Link, useNavigate } from 'react-router-dom'
import { useAppStore, selectCurrentWallet } from '../app/store'
import { LastWalletError } from '../domain/wallet'

export default function Wallets() {
  const navigate = useNavigate()
  const wallets = useAppStore((s) => s.wallets)
  const currentWallet = useAppStore(selectCurrentWallet)
  const switchWallet = useAppStore((s) => s.switchWallet)
  const setWalletArchived = useAppStore((s) => s.setWalletArchived)
  const deleteWallet = useAppStore((s) => s.deleteWallet)

  async function handleDelete(id: string, name: string) {
    const transactionCount = useAppStore
      .getState()
      .transactions.filter((t) => t.walletId === id).length
    if (
      !window.confirm(
        `確定要刪除錢包「${name}」嗎？這會一併刪除 ${transactionCount} 筆交易，且無法復原。`,
      )
    ) {
      return
    }
    try {
      await deleteWallet(id)
    } catch (err) {
      if (err instanceof LastWalletError) {
        window.alert(err.message)
        return
      }
      throw err
    }
  }

  return (
    <div className="mx-auto max-w-md space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">錢包管理</h1>
        <Link to="/wallets/new" className="rounded bg-slate-900 px-3 py-1.5 text-sm text-white">
          ＋ 新增錢包
        </Link>
      </div>

      <ul className="space-y-2">
        {wallets.map((w) => (
          <li key={w.id} className="rounded-lg bg-white p-4 shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">
                  {w.name}
                  {w.id === currentWallet?.id && (
                    <span className="ml-2 text-xs text-emerald-600">（目前）</span>
                  )}
                  {w.archived && <span className="ml-2 text-xs text-slate-400">（已封存）</span>}
                </p>
                <p className="text-sm text-slate-500">{w.currency}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {w.id !== currentWallet?.id && !w.archived && (
                  <button
                    type="button"
                    className="text-sm text-slate-600 underline"
                    onClick={() => switchWallet(w.id)}
                  >
                    切換
                  </button>
                )}
                <button
                  type="button"
                  className="text-sm text-slate-600 underline"
                  onClick={() => navigate(`/wallets/${w.id}/edit`)}
                >
                  編輯
                </button>
                <button
                  type="button"
                  className="text-sm text-slate-600 underline"
                  onClick={() => setWalletArchived(w.id, !w.archived)}
                >
                  {w.archived ? '取消封存' : '封存'}
                </button>
                <button
                  type="button"
                  className="text-sm text-red-600 underline"
                  onClick={() => handleDelete(w.id, w.name)}
                >
                  刪除
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
