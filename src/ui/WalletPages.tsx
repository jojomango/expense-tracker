import { useNavigate, useParams } from 'react-router-dom'
import { useAppStore } from '../app/store'
import WalletForm from './WalletForm'

export function NewWalletPage() {
  const navigate = useNavigate()
  const createWallet = useAppStore((s) => s.createWallet)
  return (
    <WalletForm
      heading="新增錢包"
      submitLabel="建立錢包"
      onSubmit={async (values) => {
        await createWallet(values)
        navigate('/wallets')
      }}
    />
  )
}

export function EditWalletPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const wallet = useAppStore((s) => s.wallets.find((w) => w.id === id))
  const updateWallet = useAppStore((s) => s.updateWallet)

  if (!wallet) return <p className="p-6 text-center text-slate-400">找不到這個錢包</p>

  return (
    <WalletForm
      heading="編輯錢包"
      submitLabel="儲存變更"
      initial={wallet}
      lockCurrency
      onSubmit={async (values) => {
        await updateWallet({ ...wallet, ...values, currency: wallet.currency })
        navigate('/wallets')
      }}
    />
  )
}
