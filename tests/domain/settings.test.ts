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
})
