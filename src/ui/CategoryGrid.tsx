import { sortCategoriesForDisplay, type Category, type CategoryType } from '../domain/category'

/**
 * 記帳頁的分類網格（UI-SPEC.md §5）：4 欄，取代原生 `<select>`（T8.1.3、§9 驗收）。
 *
 * 刻意不做（Phase 9 TASKS.md「刻意不做」）：分類固定色是 Phase 10 的範圍，
 * 這裡的色塊一律用單一 `track` 底色，不要臨時發明配色；選取態改用 `accent` 外框。
 */
interface CategoryGridProps {
  categories: Category[]
  type: CategoryType
  selectedId: string
  onSelect: (id: string) => void
}

export default function CategoryGrid({ categories, type, selectedId, onSelect }: CategoryGridProps) {
  const options = sortCategoriesForDisplay(categories.filter((c) => c.type === type))

  return (
    <div className="grid grid-cols-4 gap-[10px]">
      {options.map((category) => {
        const selected = category.id === selectedId
        return (
          <button
            key={category.id}
            type="button"
            data-testid="category-option"
            aria-pressed={selected}
            aria-label={`${category.icon} ${category.name}`}
            onClick={() => onSelect(category.id)}
            className="flex flex-col items-center gap-1"
          >
            <span
              className={`flex h-[50px] w-[50px] items-center justify-center rounded-chip bg-track text-[22px] ${
                selected ? 'shadow-[0_0_0_2.5px_var(--color-accent)]' : ''
              }`}
              aria-hidden="true"
            >
              {category.icon}
            </span>
            <span className={`text-[11px] ${selected ? 'text-fg' : 'text-fg2'}`}>{category.name}</span>
          </button>
        )
      })}
    </div>
  )
}
