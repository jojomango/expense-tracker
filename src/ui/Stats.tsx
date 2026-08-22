import { useMemo, useState } from 'react'
import { useAppStore, selectCurrentWallet } from '../app/store'
import { summarizeByCategory, summarizeWeeklyTrend } from '../domain/budget'
import { weekRangeOf, type WeekRange } from '../domain/week'
import { monthRangeOf } from '../domain/month'
import { todayIso, compareIsoDate } from '../domain/iso-date'
import { format, Money } from '../domain/money'
import type { Wallet } from '../domain/wallet'
import type { Transaction } from '../domain/transaction'

type RangeMode = 'week' | 'month'

/** 固定色票，依分類彙總結果的順序循環使用（不引入圖表函式庫，純 SVG 手繪）。 */
const PIE_COLORS = ['#0f172a', '#2563eb', '#059669', '#d97706', '#dc2626', '#7c3aed', '#0891b2', '#be185d']

const PIE_RADIUS = 40
const PIE_CIRCUMFERENCE = 2 * Math.PI * PIE_RADIUS

function CategoryPieChart({
  wallet,
  transactions,
  range,
}: {
  wallet: Wallet
  transactions: Transaction[]
  range: WeekRange
}) {
  const categories = useAppStore((s) => s.categories)

  const entries = useMemo(() => {
    const filtered = transactions.filter(
      (t) =>
        t.walletId === wallet.id &&
        t.type === 'expense' &&
        compareIsoDate(t.date, range.start) >= 0 &&
        compareIsoDate(t.date, range.end) <= 0,
    )
    return summarizeByCategory(filtered)
  }, [wallet, transactions, range])

  if (entries.length === 0) {
    return <p className="py-8 text-center text-sm text-slate-400">這段期間沒有支出紀錄</p>
  }

  let cumulativePercent = 0
  const segments = entries.map((entry, index) => {
    const dash = (entry.percent / 100) * PIE_CIRCUMFERENCE
    const offset = -((cumulativePercent / 100) * PIE_CIRCUMFERENCE)
    cumulativePercent += entry.percent
    return { entry, dash, offset, color: PIE_COLORS[index % PIE_COLORS.length]! }
  })

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <svg viewBox="0 0 100 100" className="h-40 w-40 -rotate-90" role="img" aria-label="分類支出佔比圖">
        {segments.map(({ entry, dash, offset, color }) => (
          <circle
            key={`${entry.type}:${entry.categoryId ?? 'none'}`}
            cx="50"
            cy="50"
            r={PIE_RADIUS}
            fill="none"
            stroke={color}
            strokeWidth="18"
            strokeDasharray={`${dash} ${PIE_CIRCUMFERENCE - dash}`}
            strokeDashoffset={offset}
          />
        ))}
      </svg>
      <ul data-testid="category-pie-legend" className="w-full space-y-1 text-sm">
        {segments.map(({ entry, color }) => {
          const category = categories.find((c) => c.id === entry.categoryId)
          const label = category ? `${category.icon} ${category.name}` : '📦 未分類'
          return (
            <li
              key={`${entry.type}:${entry.categoryId ?? 'none'}`}
              data-testid="category-pie-legend-item"
              data-category-id={entry.categoryId ?? ''}
              data-percent={entry.percent}
              data-amount={entry.amount}
              className="flex items-center justify-between gap-2"
            >
              <span className="flex items-center gap-2">
                <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
                {label}
              </span>
              <span className="text-slate-500">
                {format(Money.of(entry.amount, wallet.currency))}（{entry.percent}%）
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function WeeklyTrendChart() {
  const wallet = useAppStore(selectCurrentWallet)
  const transactions = useAppStore((s) => s.transactions)
  const weekStartDay = useAppStore((s) => s.settings.weekStartDay)

  const trend = useMemo(() => {
    if (!wallet) return []
    return summarizeWeeklyTrend(wallet, transactions, weekStartDay, new Date(), 8)
  }, [wallet, transactions, weekStartDay])

  if (!wallet) return null

  const maxAmount = Math.max(1, ...trend.map((e) => e.total.amount))
  const chartHeight = 100

  return (
    <div className="space-y-2">
      <svg viewBox={`0 0 ${trend.length * 40} ${chartHeight + 10}`} className="w-full" role="img" aria-label="近 8 週支出趨勢圖">
        {trend.map((entry, index) => {
          const barHeight = (entry.total.amount / maxAmount) * chartHeight
          return (
            <rect
              key={entry.start}
              data-testid="weekly-trend-bar"
              data-week-start={entry.start}
              data-amount={entry.total.amount}
              x={index * 40 + 6}
              y={chartHeight - barHeight}
              width={28}
              height={barHeight}
              fill="#2563eb"
            />
          )
        })}
      </svg>
      <ul data-testid="weekly-trend-legend" className="grid grid-cols-4 gap-1 text-xs text-slate-500">
        {trend.map((entry) => (
          <li key={entry.start} data-testid="weekly-trend-legend-item" data-week-start={entry.start} data-amount={entry.total.amount}>
            {entry.start.slice(5)}
            <br />
            {format(entry.total)}
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function Stats() {
  const wallet = useAppStore(selectCurrentWallet)
  const transactions = useAppStore((s) => s.transactions)
  const weekStartDay = useAppStore((s) => s.settings.weekStartDay)
  const [rangeMode, setRangeMode] = useState<RangeMode>('week')

  if (!wallet) {
    return <p className="p-6 text-center text-slate-400">沒有可用的錢包</p>
  }

  const today = todayIso(new Date())
  const range = rangeMode === 'week' ? weekRangeOf(today, weekStartDay) : monthRangeOf(today)

  return (
    <div className="mx-auto max-w-md space-y-6 p-4">
      <h1 className="text-xl font-semibold">統計</h1>

      <div className="space-y-2 rounded-lg bg-white p-4 shadow">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-slate-500">分類支出佔比</h2>
          <div className="flex gap-1">
            <button
              type="button"
              data-testid="range-week"
              onClick={() => setRangeMode('week')}
              className={`rounded px-2 py-1 text-xs ${rangeMode === 'week' ? 'bg-slate-900 text-white' : 'bg-slate-100'}`}
            >
              本週
            </button>
            <button
              type="button"
              data-testid="range-month"
              onClick={() => setRangeMode('month')}
              className={`rounded px-2 py-1 text-xs ${rangeMode === 'month' ? 'bg-slate-900 text-white' : 'bg-slate-100'}`}
            >
              本月
            </button>
          </div>
        </div>
        <CategoryPieChart wallet={wallet} transactions={transactions} range={range} />
      </div>

      <div className="space-y-2 rounded-lg bg-white p-4 shadow">
        <h2 className="text-sm font-medium text-slate-500">近 8 週支出趨勢</h2>
        <WeeklyTrendChart />
      </div>
    </div>
  )
}
