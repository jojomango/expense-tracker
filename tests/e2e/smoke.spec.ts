import { test, expect } from '@playwright/test'

test('E2E-0 — 應用程式可載入（Phase 0 冒煙測試）', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: '記帳本' })).toBeVisible()
})
