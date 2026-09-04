import { test, expect } from '@playwright/test'

test('E2E-0 — 應用程式可載入（Phase 0 冒煙測試）', async ({ page }) => {
  await page.goto('/')
  // Phase 8 起移除了全域標題列的「記帳本」文字（UI-SPEC.md §3.1：底部分頁列
  // 取代標題列連結），app 名稱只留在 <title> 與 PWA manifest。首次啟動引導畫面
  // 的標題是現在「app 已成功載入」最直接可斷言的訊號。
  await expect(page.getByRole('heading', { name: '建立第一個錢包' })).toBeVisible()
})
