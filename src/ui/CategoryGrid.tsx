import type { CSSProperties } from 'react'
import { sortCategoriesForDisplay, type Category, type CategoryType } from '../domain/category'

/**
 * 記帳頁的分類網格（UI-SPEC.md §5）：4 欄，取代原生 `<select>`（T8.1.3、§9 驗收）。
 *
 * Phase 10 接上分類固定色：色塊底色是 `category.color` 的淡色 tint
 * （`.cat-tint`，見 index.css），選取態外框也改用該分類的顏色本身
 * （UI-SPEC.md §5：`box-shadow: 0 0 0 2.5px {分類色}`），取代 Phase 9 暫時
 * 簡化用的固定 `accent` 外框。
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
              className={`cat-tint flex h-[50px] w-[50px] items-center justify-center rounded-chip text-[22px] ${
                selected ? 'shadow-[0_0_0_2.5px_var(--cat)]' : ''
              }`}
              style={{ '--cat': category.color } as CSSProperties}
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
