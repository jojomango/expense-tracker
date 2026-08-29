/**
 * BackupReminder — SPEC.md §3.6「App 首次啟動後每 7 天提醒一次備份」的純判斷邏輯。
 *
 * 不知道「現在」也不知道「使用者何時第一次啟動」——這兩者都由呼叫端注入
 * （比照 CLAUDE.md「時間當參數傳入」的慣例），這裡只回答「該不該提醒」。
 */

const REMINDER_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000

export interface BackupReminderState {
  /** app 第一次啟動的時間（ISO 時間戳）；null 代表這台裝置沒有記錄過。 */
  readonly firstLaunchAt: string | null
  /** 最近一次成功匯出備份的時間（ISO 時間戳）；null 代表從未備份過。 */
  readonly lastBackupAt: string | null
}

/**
 * 計時起點：備份過就從最近一次備份算起，否則從第一次啟動算起。
 * 兩者都沒有（連 firstLaunchAt 都不知道）就不提醒——那代表這是還沒走過
 * 首次啟動流程的極早期狀態，不該提醒使用者備份不存在的資料。
 */
export function shouldRemindBackup(state: BackupReminderState, now: Date): boolean {
  const baseline = state.lastBackupAt ?? state.firstLaunchAt
  if (!baseline) return false
  const elapsed = now.getTime() - new Date(baseline).getTime()
  return elapsed >= REMINDER_INTERVAL_MS
}
