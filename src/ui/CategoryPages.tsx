import { useNavigate, useParams } from 'react-router-dom'
import { useAppStore } from '../app/store'
import CategoryForm from './CategoryForm'

export function NewCategoryPage() {
  const navigate = useNavigate()
  const addCategory = useAppStore((s) => s.addCategory)
  return (
    <CategoryForm
      heading="新增分類"
      submitLabel="建立分類"
      onSubmit={async (values) => {
        await addCategory(values)
        navigate('/categories')
      }}
    />
  )
}

export function EditCategoryPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const category = useAppStore((s) => s.categories.find((c) => c.id === id))
  const updateCategory = useAppStore((s) => s.updateCategory)

  if (!category) return <p className="p-6 text-center text-slate-400">找不到這個分類</p>

  return (
    <CategoryForm
      heading="編輯分類"
      submitLabel="儲存變更"
      initial={category}
      lockType
      onSubmit={async (values) => {
        await updateCategory({ ...category, ...values, type: category.type })
        navigate('/categories')
      }}
    />
  )
}
