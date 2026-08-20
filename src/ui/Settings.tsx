import { useAppStore } from '../app/store'
import type { WeekStartDay } from '../domain/week'

const WEEK_START_LABELS: Record<WeekStartDay, string> = {
  0: '週日',
  1: '週一',
  2: '週二',
  3: '週三',
  4: '週四',
  5: '週五',
  6: '週六',
}

const WEEK_START_DAYS = [0, 1, 2, 3, 4, 5, 6] as const

export default function Settings() {
  const weekStartDay = useAppStore((s) => s.settings.weekStartDay)
  const updateSettings = useAppStore((s) => s.updateSettings)

  return (
    <div className="mx-auto max-w-sm space-y-4 p-6">
      <h1 className="text-xl font-semibold">設定</h1>

      <div>
        <label htmlFor="week-start-day" className="block text-sm font-medium">
          週起始日
        </label>
        <select
          id="week-start-day"
          className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
          value={weekStartDay}
          onChange={(e) => updateSettings({ weekStartDay: Number(e.target.value) as WeekStartDay })}
        >
          {WEEK_START_DAYS.map((day) => (
            <option key={day} value={day}>
              {WEEK_START_LABELS[day]}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
