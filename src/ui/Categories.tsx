import { Link, useNavigate } from 'react-router-dom'
import { useAppStore } from '../app/store'
import { DefaultCategoryError, type Category } from '../domain/category'

function CategoryGroup({
  title,
  categories,
  onDelete,
}: {
  title: string
  categories: Category[]
  onDelete: (id: string, name: string) => void
}) {
  const navigate = useNavigate()
  return (
    <div className="space-y-2">
      <h2 className="text-sm font-medium text-slate-500">{title}</h2>
      <ul className="space-y-2">
        {categories.map((c) => (
          <li
            key={c.id}
            data-testid="category-item"
            className="flex items-center justify-between rounded-lg bg-white p-3 shadow"
          >
            <span>
              {c.icon} {c.name}
              {c.isDefault && <span className="ml-2 text-xs text-slate-400">（系統預設）</span>}
            </span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="text-sm text-slate-600 underline"
                onClick={() => navigate(`/categories/${c.id}/edit`)}
              >
                編輯
              </button>
              <button
                type="button"
                data-testid="delete-category"
                className="text-sm text-red-600 underline"
                onClick={() => onDelete(c.id, c.name)}
              >
                刪除
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function Categories() {
  const categories = useAppStore((s) => s.categories)
  const deleteCategory = useAppStore((s) => s.deleteCategory)

  async function handleDelete(id: string, name: string) {
    if (!window.confirm(`確定要刪除分類「${name}」嗎？該分類的交易會轉移到「未分類」。`)) {
      return
    }
    try {
      await deleteCategory(id)
    } catch (err) {
      if (err instanceof DefaultCategoryError) {
        window.alert(err.message)
        return
      }
      throw err
    }
  }

  const expenseCategories = categories.filter((c) => c.type === 'expense')
  const incomeCategories = categories.filter((c) => c.type === 'income')

  return (
    <div className="mx-auto max-w-md space-y-6 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">分類管理</h1>
        <Link
          to="/categories/new"
          className="rounded bg-slate-900 px-3 py-1.5 text-sm text-white"
        >
          ＋ 新增分類
        </Link>
      </div>

      <CategoryGroup title="支出分類" categories={expenseCategories} onDelete={handleDelete} />
      <CategoryGroup title="收入分類" categories={incomeCategories} onDelete={handleDelete} />
    </div>
  )
}
