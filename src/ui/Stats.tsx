import { useMemo, useState } from 'react'
import { useAppStore, selectCurrentWallet } from '../app/store'
import { summarizeByCategory, summarizeWeeklyTrend } from '../domain/budget'
import { weekRangeOf, formatMonthDay, type WeekRange } from '../domain/week'
import { monthRangeOf } from '../domain/month'
import { todayIso, compareIsoDate } from '../domain/iso-date'
import { format, sum, subtract, Money } from '../domain/money'
import { FALLBACK_CATEGORY_COLOR, type Category } from '../domain/category'
import type { Wallet } from '../domain/wallet'
import type { Transaction } from '../domain/transaction'

type RangeMode = 'week' | 'month'

const PIE_RADIUS = 42
const PIE_CIRCUMFERENCE = 2 * Math.PI * PIE_RADIUS

function colorFor(categories: Category[], categoryId: string | null): string {
  if (categoryId === null) return FALLBACK_CATEGORY_COLOR
  return categories.find((c) => c.id === categoryId)?.color ?? FALLBACK_CATEGORY_COLOR
}

function labelFor(categories: Category[], categoryId: string | null): string {
  if (categoryId === null) return '📦 未分類'
  const category = categories.find((c) => c.id === categoryId)
  return category ? `${category.icon} ${category.name}` : '📦 未分類'
}

/**
 * 分類支出佔比圓環（UI-SPEC.md §6）。顏色一律讀 `category.color`（分類固定色，
 * Phase 10），不再用排序位次決定顏色——同一分類在本週/本月排名不同也不會變色
 * （T8.3.6）。圓環中心疊字用 HTML（不是 SVG `<text>`），比 SVG 文字更容易置中
 * 且不受旋轉影響。
 */
function CategoryDonut({
  wallet,
  transactions,
  range,
  rangeMode,
}: {
  wallet: Wallet
  transactions: Transaction[]
  range: WeekRange
  rangeMode: RangeMode
}) {
  const categories = useAppStore((s) => s.categories)

  const { entries, total } = useMemo(() => {
    const filtered = transactions.filter(
      (t) =>
        t.walletId === wallet.id &&
        t.type === 'expense' &&
        compareIsoDate(t.date, range.start) >= 0 &&
        compareIsoDate(t.date, range.end) <= 0,
    )
    const summary = summarizeByCategory(filtered)
    const totalMoney = sum(
      filtered.map((t) => Money.of(t.amount, wallet.currency)),
      wallet.currency,
    )
    return { entries: summary, total: totalMoney }
  }, [wallet, transactions, range])

  if (entries.length === 0) {
    return <p className="py-8 text-center text-body text-fg3">這段期間沒有支出紀錄</p>
  }

  let cumulativePercent = 0
  const segments = entries.map((entry) => {
    const dash = (entry.percent / 100) * PIE_CIRCUMFERENCE
    const offset = -((cumulativePercent / 100) * PIE_CIRCUMFERENCE)
    cumulativePercent += entry.percent
    return { entry, dash, offset, color: colorFor(categories, entry.categoryId) }
  })

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
      <div className="relative h-[190px] w-[190px] shrink-0">
        <svg viewBox="0 0 100 100" className="h-[190px] w-[190px] -rotate-90" role="img" aria-label="分類支出佔比圖">
          <circle cx="50" cy="50" r={PIE_RADIUS} fill="none" stroke="var(--color-track)" strokeWidth="11" />
          {segments.map(({ entry, dash, offset, color }) => (
            <circle
              key={`${entry.type}:${entry.categoryId ?? 'none'}`}
              cx="50"
              cy="50"
              r={PIE_RADIUS}
              fill="none"
              stroke={color}
              strokeWidth="11"
              strokeDasharray={`${dash} ${PIE_CIRCUMFERENCE - dash}`}
              strokeDashoffset={offset}
            />
          ))}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[12px] text-fg2">{rangeMode === 'week' ? '本週支出' : '本月支出'}</span>
          <span data-testid="donut-total" className="text-donut-total tabular-nums text-fg">
            {format(total)}
          </span>
        </div>
      </div>
      <ul data-testid="category-pie-legend" className="w-full min-w-0 space-y-3 text-body">
        {segments.map(({ entry, color }) => (
          <li
            key={`${entry.type}:${entry.categoryId ?? 'none'}`}
            data-testid="category-pie-legend-item"
            data-category-id={entry.categoryId ?? ''}
            data-color={color}
            data-percent={entry.percent}
            data-amount={entry.amount}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="flex min-w-0 items-center gap-2 whitespace-nowrap text-fg">
                <span className="inline-block h-[10px] w-[10px] shrink-0 rounded-[3px]" style={{ backgroundColor: color }} />
                {labelFor(categories, entry.categoryId)}
              </span>
              <span className="shrink-0 whitespace-nowrap text-fg2">
                {format(Money.of(entry.amount, wallet.currency))} · {entry.percent}%
              </span>
            </div>
            <div className="mt-1 h-1 w-full overflow-hidden rounded-pill bg-track">
              <div className="h-full rounded-pill" style={{ width: `${entry.percent}%`, backgroundColor: color }} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** 近 8 週支出趨勢卡（UI-SPEC.md §6）：平均虛線、當週標記、HTML 週別標籤對齊柱子。 */
function WeeklyTrendCard() {
  const wallet = useAppStore(selectCurrentWallet)
  const transactions = useAppStore((s) => s.transactions)
  const weekStartDay = useAppStore((s) => s.settings.weekStartDay)

  const trend = useMemo(() => {
    if (!wallet) return []
    return summarizeWeeklyTrend(wallet, transactions, weekStartDay, new Date(), 8)
  }, [wallet, transactions, weekStartDay])

  if (!wallet || trend.length === 0) return null

  const currency = wallet.currency
  const total = sum(
    trend.map((e) => e.total),
    currency,
  )
  const average = Money.of(Math.round(total.amount / trend.length), currency)
  const currentWeek = trend[trend.length - 1]!
  const diff = subtract(currentWeek.total, average)
  const diffLabel =
    diff.amount < 0
      ? `比平均少 ${format(Money.of(-diff.amount, currency))}`
      : diff.amount > 0
        ? `比平均多 ${format(Money.of(diff.amount, currency))}`
        : '與平均相同'

  const maxAmount = Math.max(1, average.amount, ...trend.map((e) => e.total.amount))
  const chartHeight = 92
  const svgHeight = 100
  const barWidth = 26
  const columnWidth = 40
  const avgY = svgHeight - 6 - (average.amount / maxAmount) * chartHeight

  return (
    <div className="space-y-1 rounded-card bg-card p-[22px] shadow-card">
      <div className="flex items-baseline justify-between">
        <h2 className="text-card-title text-fg">近 8 週支出</h2>
        <span className="text-caption text-fg2">{diffLabel}</span>
      </div>
      <p className="text-[12px] text-fg3">每週平均 {format(average)}</p>

      <div className="pt-2">
        <svg viewBox={`0 0 ${trend.length * columnWidth} ${svgHeight}`} className="w-full" role="img" aria-label="近 8 週支出趨勢圖">
          <line
            x1="0"
            x2={trend.length * columnWidth}
            y1={avgY}
            y2={avgY}
            style={{ stroke: 'var(--color-fg3)' }}
            strokeWidth="1"
            strokeDasharray="3 4"
          />
          {trend.map((entry, index) => {
            const isCurrentWeek = index === trend.length - 1
            const barHeight = (entry.total.amount / maxAmount) * chartHeight
            return (
              <rect
                key={entry.start}
                data-testid="weekly-trend-bar"
                data-week-start={entry.start}
                data-amount={entry.total.amount}
                x={index * columnWidth + 7}
                y={svgHeight - 6 - barHeight}
                width={barWidth}
                height={barHeight}
                rx={5}
                style={{ fill: isCurrentWeek ? 'var(--color-accent)' : 'var(--color-trend-bar)' }}
              />
            )
          })}
        </svg>
        <div className="grid" style={{ gridTemplateColumns: `repeat(${trend.length}, 1fr)` }}>
          {trend.map((entry, index) => {
            const isCurrentWeek = index === trend.length - 1
            return (
              <span
                key={entry.start}
                data-testid="weekly-trend-label"
                data-week-start={entry.start}
                className={`text-center text-[10px] ${isCurrentWeek ? 'font-medium text-accent' : 'text-fg3'}`}
              >
                {formatMonthDay(entry.start)}
              </span>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default function Stats() {
  const wallet = useAppStore(selectCurrentWallet)
  const transactions = useAppStore((s) => s.transactions)
  const weekStartDay = useAppStore((s) => s.settings.weekStartDay)
  const [rangeMode, setRangeMode] = useState<RangeMode>('week')

  if (!wallet) {
    return <p className="p-6 text-center text-fg3">沒有可用的錢包</p>
  }

  const today = todayIso(new Date())
  const range = rangeMode === 'week' ? weekRangeOf(today, weekStartDay) : monthRangeOf(today)

  return (
    <div className="mx-auto max-w-md space-y-4 p-5">
      <h1 className="text-title-lg text-fg">統計</h1>

      <div className="flex rounded-[9px] bg-track p-[2px]">
        <button
          type="button"
          data-testid="range-week"
          onClick={() => setRangeMode('week')}
          className={`min-h-11 flex-1 rounded-[7px] text-body ${
            rangeMode === 'week' ? 'bg-card text-fg shadow-[0_1px_3px_rgba(0,0,0,0.16)]' : 'text-fg2'
          }`}
        >
          本週
        </button>
        <button
          type="button"
          data-testid="range-month"
          onClick={() => setRangeMode('month')}
          className={`min-h-11 flex-1 rounded-[7px] text-body ${
            rangeMode === 'month' ? 'bg-card text-fg shadow-[0_1px_3px_rgba(0,0,0,0.16)]' : 'text-fg2'
          }`}
        >
          本月
        </button>
      </div>

      <div className="rounded-card bg-card p-[22px] shadow-card">
        <CategoryDonut wallet={wallet} transactions={transactions} range={range} rangeMode={rangeMode} />
      </div>

      <WeeklyTrendCard />
    </div>
  )
}
