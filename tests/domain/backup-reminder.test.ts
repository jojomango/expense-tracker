import { describe, it, expect } from 'vitest'
import { shouldRemindBackup } from '../../src/domain/backup-reminder'

// Phase 7 新增，非 TESTCASES.md 契約項目——SPEC.md §3.6「App 首次啟動後每 7 天
// 提醒一次備份」沒有對應的正式測案編號，測試名稱用描述性中文（比照 Phase 2/6
// 對「規格沒細講、需要純函式覆蓋」的處理方式）。
describe('shouldRemindBackup — 備份提醒（SPEC.md §3.6）', () => {
  it('從未啟動過（firstLaunchAt 與 lastBackupAt 皆為 null）不提醒', () => {
    expect(
      shouldRemindBackup({ firstLaunchAt: null, lastBackupAt: null }, new Date('2026-08-11T00:00:00Z')),
    ).toBe(false)
  })

  it('首次啟動未滿 7 天不提醒', () => {
    expect(
      shouldRemindBackup(
        { firstLaunchAt: '2026-08-05T00:00:00Z', lastBackupAt: null },
        new Date('2026-08-11T00:00:00Z'),
      ),
    ).toBe(false)
  })

  it('首次啟動恰滿 7 天提醒（邊界）', () => {
    expect(
      shouldRemindBackup(
        { firstLaunchAt: '2026-08-04T00:00:00Z', lastBackupAt: null },
        new Date('2026-08-11T00:00:00Z'),
      ),
    ).toBe(true)
  })

  it('首次啟動超過 7 天提醒', () => {
    expect(
      shouldRemindBackup(
        { firstLaunchAt: '2026-07-01T00:00:00Z', lastBackupAt: null },
        new Date('2026-08-11T00:00:00Z'),
      ),
    ).toBe(true)
  })

  it('已備份過，以 lastBackupAt 而非 firstLaunchAt 為計時起點', () => {
    expect(
      shouldRemindBackup(
        { firstLaunchAt: '2026-01-01T00:00:00Z', lastBackupAt: '2026-08-10T00:00:00Z' },
        new Date('2026-08-11T00:00:00Z'),
      ),
    ).toBe(false)
  })

  it('距最近一次備份滿 7 天後重新提醒', () => {
    expect(
      shouldRemindBackup(
        { firstLaunchAt: '2026-01-01T00:00:00Z', lastBackupAt: '2026-08-01T00:00:00Z' },
        new Date('2026-08-08T00:00:00Z'),
      ),
    ).toBe(true)
  })
})
