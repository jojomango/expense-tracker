import { useState, type ChangeEvent, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAppStore } from '../app/store'
import type { WeekStartDay } from '../domain/week'
import type { Theme } from '../domain/settings'
import { shouldRemindBackup } from '../domain/backup-reminder'
import { BackupError } from '../domain/backup'
import BackLink from './BackLink'

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

const THEME_LABELS: Record<Theme, string> = {
  system: '跟隨系統',
  light: '淺色',
  dark: '深色',
}

const THEMES: Theme[] = ['system', 'light', 'dark']

/** SPEC.md §3.6：需要輸入這串確認字才會執行 replace（清空現有資料）。 */
const REPLACE_CONFIRM_PHRASE = '確認取代'

function downloadTextFile(filename: string, content: string) {
  const blob = new Blob([content], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function BackupReminderBanner({ onBackupNow }: { onBackupNow: () => void }) {
  const { firstLaunchAt, lastBackupAt } = useAppStore((s) => s.settings)
  const [dismissed, setDismissed] = useState(false)

  const due = shouldRemindBackup({ firstLaunchAt, lastBackupAt }, new Date())
  if (!due || dismissed) return null

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="backup-reminder-banner"
      className="flex items-center justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100"
    >
      <span>你已經一段時間沒有備份資料了，建議匯出備份以免資料遺失。</span>
      <div className="flex shrink-0 items-center gap-3">
        <button type="button" className="underline" onClick={onBackupNow}>
          立即備份
        </button>
        <button type="button" className="underline" onClick={() => setDismissed(true)}>
          稍後
        </button>
      </div>
    </div>
  )
}

function ExportSection({ onExported }: { onExported: () => void }) {
  const exportBackup = useAppStore((s) => s.exportBackup)
  const [message, setMessage] = useState<string | null>(null)

  async function handleExport() {
    const { filename, content } = await exportBackup()
    downloadTextFile(filename, content)
    setMessage(`已匯出 ${filename}`)
    onExported()
  }

  return (
    <div className="space-y-2">
      <h2 className="text-sm font-medium text-slate-500 dark:text-slate-400">匯出備份</h2>
      <button
        type="button"
        data-testid="export-backup-button"
        className="rounded bg-slate-900 px-3 py-1.5 text-sm text-white dark:bg-slate-100 dark:text-slate-900"
        onClick={() => void handleExport()}
      >
        匯出備份
      </button>
      {message && (
        <p role="status" className="text-sm text-emerald-600 dark:text-emerald-400">
          {message}
        </p>
      )}
    </div>
  )
}

function ImportSection() {
  const importBackup = useAppStore((s) => s.importBackup)
  const [mode, setMode] = useState<'replace' | 'merge'>('merge')
  const [confirmText, setConfirmText] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    setFile(e.target.files?.[0] ?? null)
    setError(null)
    setSuccess(null)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    if (!file) {
      setError('請先選擇備份檔')
      return
    }
    if (mode === 'replace' && confirmText !== REPLACE_CONFIRM_PHRASE) {
      setError(`請輸入「${REPLACE_CONFIRM_PHRASE}」以確認清空現有資料`)
      return
    }
    try {
      const text = await file.text()
      await importBackup(mode, text)
      setSuccess('匯入完成')
      setFile(null)
      setConfirmText('')
    } catch (err) {
      setError(err instanceof BackupError ? err.message : '匯入失敗，請確認備份檔是否正確')
    }
  }

  return (
    <form className="space-y-2" onSubmit={(e) => void handleSubmit(e)}>
      <h2 className="text-sm font-medium text-slate-500 dark:text-slate-400">匯入備份</h2>

      <fieldset className="flex gap-4 text-sm">
        <legend className="sr-only">匯入模式</legend>
        <label className="flex items-center gap-1">
          <input
            type="radio"
            name="import-mode"
            value="merge"
            checked={mode === 'merge'}
            onChange={() => setMode('merge')}
          />
          合併（保留現有資料）
        </label>
        <label className="flex items-center gap-1">
          <input
            type="radio"
            name="import-mode"
            value="replace"
            checked={mode === 'replace'}
            onChange={() => setMode('replace')}
          />
          取代（清空現有資料）
        </label>
      </fieldset>

      <input
        type="file"
        accept="application/json,.json"
        data-testid="import-file-input"
        onChange={handleFileChange}
      />

      {mode === 'replace' && (
        <div>
          <label htmlFor="replace-confirm" className="block text-sm">
            輸入「{REPLACE_CONFIRM_PHRASE}」以確認清空現有資料
          </label>
          <input
            id="replace-confirm"
            type="text"
            data-testid="replace-confirm-input"
            className="mt-1 w-full rounded border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-800"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
          />
        </div>
      )}

      <button
        type="submit"
        data-testid="import-backup-button"
        className="rounded bg-slate-900 px-3 py-1.5 text-sm text-white dark:bg-slate-100 dark:text-slate-900"
      >
        匯入
      </button>

      {error && (
        <p role="alert" data-testid="import-error" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
      {success && (
        <p role="status" data-testid="import-success" className="text-sm text-emerald-600 dark:text-emerald-400">
          {success}
        </p>
      )}
    </form>
  )
}

export default function Settings() {
  const weekStartDay = useAppStore((s) => s.settings.weekStartDay)
  const theme = useAppStore((s) => s.settings.theme)
  const updateSettings = useAppStore((s) => s.updateSettings)

  return (
    <div className="mx-auto max-w-sm space-y-6 p-6">
      <div>
        <BackLink to="/" />
        <h1 className="text-xl font-semibold">設定</h1>
      </div>

      <BackupReminderBanner onBackupNow={() => document.getElementById('export-anchor')?.scrollIntoView()} />

      <div>
        <Link
          to="/categories"
          data-testid="categories-entry"
          className="flex items-center justify-between rounded border border-slate-300 px-3 py-2 dark:border-slate-600"
        >
          <span>分類管理</span>
          <span aria-hidden="true" className="text-fg2">
            ›
          </span>
        </Link>
      </div>

      <div>
        <label htmlFor="week-start-day" className="block text-sm font-medium">
          週起始日
        </label>
        <select
          id="week-start-day"
          className="mt-1 w-full rounded border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-800"
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

      <div>
        <label htmlFor="theme" className="block text-sm font-medium">
          外觀
        </label>
        <select
          id="theme"
          data-testid="theme-select"
          className="mt-1 w-full rounded border border-slate-300 px-3 py-2 dark:border-slate-600 dark:bg-slate-800"
          value={theme}
          onChange={(e) => updateSettings({ theme: e.target.value as Theme })}
        >
          {THEMES.map((t) => (
            <option key={t} value={t}>
              {THEME_LABELS[t]}
            </option>
          ))}
        </select>
      </div>

      <div id="export-anchor" className="space-y-6 border-t border-slate-200 pt-4 dark:border-slate-700">
        <ExportSection onExported={() => undefined} />
        <ImportSection />
      </div>
    </div>
  )
}
