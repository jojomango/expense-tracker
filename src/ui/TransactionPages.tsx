import { useParams } from 'react-router-dom'
import { useAppStore, selectCurrentWallet } from '../app/store'
import TransactionForm from './TransactionForm'

export function NewTransactionPage() {
  const wallet = useAppStore(selectCurrentWallet)
  if (!wallet) return <p className="p-6 text-center text-slate-400">請先建立錢包</p>
  return <TransactionForm wallet={wallet} />
}

export function EditTransactionPage() {
  const { id } = useParams<{ id: string }>()
  const transaction = useAppStore((s) => s.transactions.find((t) => t.id === id))
  const wallet = useAppStore((s) => s.wallets.find((w) => w.id === transaction?.walletId))

  if (!transaction || !wallet) {
    return <p className="p-6 text-center text-slate-400">找不到這筆交易</p>
  }
  return <TransactionForm wallet={wallet} initial={transaction} />
}
