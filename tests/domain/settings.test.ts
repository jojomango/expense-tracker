import { describe, it, expect } from 'vitest'
import { DEFAULT_SETTINGS } from '../../src/domain/settings'

describe('Settings — 預設值（SPEC.md §3.5）', () => {
  it('weekStartDay 預設為 1（週一）', () => {
    expect(DEFAULT_SETTINGS.weekStartDay).toBe(1)
  })

  it('theme 預設為 system', () => {
    expect(DEFAULT_SETTINGS.theme).toBe('system')
  })

  it('defaultWalletId 預設為 null（尚未選定）', () => {
    expect(DEFAULT_SETTINGS.defaultWalletId).toBeNull()
  })

  it('firstLaunchAt 預設為 null（這台裝置還沒記錄過首次啟動時間）', () => {
    expect(DEFAULT_SETTINGS.firstLaunchAt).toBeNull()
  })

  it('lastBackupAt 預設為 null（從未備份過）', () => {
    expect(DEFAULT_SETTINGS.lastBackupAt).toBeNull()
  })
})
