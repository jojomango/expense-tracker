import { useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAppStore } from '../app/store'
import type { Transaction } from '../domain/transaction'
import { FALLBACK_CATEGORY_COLOR, type Category } from '../domain/category'
import type { Wallet } from '../domain/wallet'
import { Money, format } from '../domain/money'
import { compareIsoDate } from '../domain/iso-date'
import {
  groupByWeek,
  groupByDay,
  formatWeekGroupTitle,
  formatMonthDay,
  weekdayLabel,
  type WeekStartDay,
} from '../domain/week'
import { showToast } from './Toast'

interface TransactionListProps {
  wallet: Wallet
  transactions: Transaction[]
  categories: Category[]
  weekStartDay: WeekStartDay
}

const FALLBACK_ICON = '📦'
const FALLBACK_NAME = '未分類'
/** 露出的刪除鍵寬度（UI-SPEC.md §4.3）。拖曳位移的可視範圍略寬一點，帶一點回彈手感。 */
const OPEN_OFFSET = -88
const DRAG_CLAMP = -96
/** 放開時判斷「該不該停在展開態」的門檻，也同時是「這算不算一次拖曳（而非點擊）」的門檻。 */
const OPEN_THRESHOLD = -44
const TAP_THRESHOLD = 5

function categoryOf(
  categories: Category[],
  categoryId: string | null,
): { icon: string; name: string; color: string } {
  if (categoryId === null) return { icon: FALLBACK_ICON, name: FALLBACK_NAME, color: FALLBACK_CATEGORY_COLOR }
  const category = categories.find((c) => c.id === categoryId)
  return category
    ? { icon: category.icon, name: category.name, color: category.color }
    : { icon: FALLBACK_ICON, name: FALLBACK_NAME, color: FALLBACK_CATEGORY_COLOR }
}

/** 週內依日期新到舊排序（groupByWeek 本身回傳日期正序，見 week.ts 交接筆記）。 */
function sortNewestFirst(items: readonly Transaction[]): Transaction[] {
  return [...items].sort((a, b) => {
    const byDate = compareIsoDate(b.date, a.date)
    if (byDate !== 0) return byDate
    return b.createdAt.localeCompare(a.createdAt)
  })
}

/** 該組小計：支出減收入的淨額（UI-SPEC.md §4.3），符號依淨額正負決定。 */
function groupSubtotalText(items: readonly Transaction[], currency: string): string {
  const net = items.reduce((sum, t) => sum + (t.type === 'expense' ? t.amount : -t.amount), 0)
  const sign = net > 0 ? '-' : net < 0 ? '+' : ''
  return `${sign}${format(Money.of(Math.abs(net), currency))}`
}

interface TransactionRowProps {
  transaction: Transaction
  wallet: Wallet
  categories: Category[]
  isOpen: boolean
  bordered: boolean
  onOpenChange: (open: boolean) => void
  onDeleteRequested: (transaction: Transaction) => void
}

function TransactionRow({
  transaction,
  wallet,
  categories,
  isOpen,
  bordered,
  onOpenChange,
  onDeleteRequested,
}: TransactionRowProps) {
  const navigate = useNavigate()
  const { icon, name, color } = categoryOf(categories, transaction.categoryId)
  const [dragOffset, setDragOffset] = useState<number | null>(null)
  const startRef = useRef<{ x: number; base: number } | null>(null)

  const restOffset = isOpen ? OPEN_OFFSET : 0
  const offset = dragOffset ?? restOffset
  const showDeleteAction = offset < -1

  function handlePointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId)
    startRef.current = { x: e.clientX, base: restOffset }
    setDragOffset(restOffset)
  }

  function handlePointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!startRef.current) return
    const dx = e.clientX - startRef.current.x
    setDragOffset(Math.min(0, Math.max(DRAG_CLAMP, startRef.current.base + dx)))
  }

  function handlePointerUp(e: ReactPointerEvent<HTMLDivElement>) {
    if (!startRef.current) return
    const dx = e.clientX - startRef.current.x
    const finalOffset = dragOffset ?? restOffset
    const wasTap = Math.abs(dx) < TAP_THRESHOLD
    startRef.current = null
    setDragOffset(null)

    if (wasTap) {
      if (isOpen) {
        onOpenChange(false)
      } else {
        navigate(`/transactions/${transaction.id}/edit`)
      }
      return
    }
    onOpenChange(finalOffset <= OPEN_THRESHOLD)
  }

  return (
    <li
      data-testid="transaction-row"
      className={`relative overflow-hidden ${bordered ? 'border-t border-sep' : ''}`}
    >
      {showDeleteAction && (
        <button
          type="button"
          data-testid="transaction-delete-action"
          onClick={() => onDeleteRequested(transaction)}
          className="absolute inset-y-0 right-0 w-[88px] bg-danger text-body font-medium text-white"
        >
          刪除
        </button>
      )}
      <div
        data-testid="transaction-item"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{
          transform: `translateX(${offset}px)`,
          transition: dragOffset === null ? 'transform 220ms cubic-bezier(0.2, 0.8, 0.2, 1)' : 'none',
          touchAction: 'pan-y',
        }}
        className="flex min-h-11 items-center gap-3 bg-card px-[14px] py-[11px]"
      >
        <span
          className="cat-tint flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-chip text-[19px]"
          style={{ '--cat': color } as CSSProperties}
          aria-hidden="true"
        >
          {icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-row-title text-fg">{name}</span>
          {/* 日期已經由外層的「日」分組標題顯示，這裡只剩備註（沒有備註就不佔一行）。 */}
          {transaction.note && (
            <span className="block truncate text-caption text-fg2">{transaction.note}</span>
          )}
        </span>
        <span
          className={`shrink-0 text-row-amount tabular-nums ${
            transaction.type === 'expense' ? 'text-fg' : 'text-income'
          }`}
        >
          {transaction.type === 'expense' ? '-' : '+'}
          {format(Money.of(transaction.amount, wallet.currency))}
        </span>
      </div>
    </li>
  )
}

export default function TransactionList({
  wallet,
  transactions,
  categories,
  weekStartDay,
}: TransactionListProps) {
  const deleteTransaction = useAppStore((s) => s.deleteTransaction)
  const restoreTransaction = useAppStore((s) => s.restoreTransaction)
  const [openId, setOpenId] = useState<string | null>(null)

  async function handleDeleteRequested(transaction: Transaction) {
    const { name } = categoryOf(categories, transaction.categoryId)
    await deleteTransaction(transaction.id)
    setOpenId(null)
    showToast(`已刪除 ${name} ${format(Money.of(transaction.amount, wallet.currency))}`, {
      label: '還原',
      onAction: () => void restoreTransaction(transaction),
    })
  }

  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <span className="text-4xl" aria-hidden="true">
          📝
        </span>
        <p className="text-body text-fg2">這個錢包還沒有交易</p>
        <Link
          to="/transactions/new"
          className="rounded-pill bg-accent px-5 py-2 text-body font-medium text-white"
        >
          記第一筆
        </Link>
      </div>
    )
  }

  const now = new Date()
  const groups = groupByWeek(transactions, (t) => t.date, weekStartDay)

  return (
    <div data-testid="transaction-list" className="space-y-4">
      {groups.map((group) => (
        <div key={group.start}>
          <div className="mb-2 flex items-baseline justify-between px-1">
            <h4 data-testid="week-group-header" className="text-[13px] font-semibold text-fg2">
              {formatWeekGroupTitle(group, weekStartDay, now)}
            </h4>
            <span className="text-[13px] tabular-nums text-fg3">
              {groupSubtotalText(group.items, wallet.currency)}
            </span>
          </div>
          <div className="space-y-3">
            {groupByDay(group.items, (t) => t.date).map((day) => (
              <div key={day.date}>
                <div className="mb-1.5 flex items-baseline justify-between px-1">
                  <span data-testid="day-group-header" className="text-caption text-fg2">
                    {formatMonthDay(day.date)} · {weekdayLabel(day.date)}
                  </span>
                  <span
                    data-testid="day-group-subtotal"
                    className="text-caption font-semibold tabular-nums text-fg"
                  >
                    {groupSubtotalText(day.items, wallet.currency)}
                  </span>
                </div>
                <ul className="overflow-hidden rounded-group bg-card shadow-card">
                  {sortNewestFirst(day.items).map((t, index) => (
                    <TransactionRow
                      key={t.id}
                      transaction={t}
                      wallet={wallet}
                      categories={categories}
                      isOpen={openId === t.id}
                      bordered={index > 0}
                      onOpenChange={(open) => setOpenId(open ? t.id : null)}
                      onDeleteRequested={(tx) => void handleDeleteRequested(tx)}
                    />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
