import { test, expect, type Page } from '@playwright/test'

/**
 * TESTCASES.md E2E-6（備份與還原）、E2E-7（離線與 PWA）。
 * 每個測試從乾淨的 IndexedDB 開始（Playwright 預設每個測試獨立瀏覽器 context）。
 */

async function createFirstWallet(
  page: Page,
  opts: { name: string; currency: string; budgetMode: string; budgetAmount: string },
) {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: '建立第一個錢包' })).toBeVisible()
  await page.getByLabel('錢包名稱').fill(opts.name)
  await page.getByLabel('幣別').selectOption(opts.currency)
  await page.getByLabel('預算模式').selectOption(opts.budgetMode)
  if (opts.budgetMode !== 'none') {
    await page.getByLabel('預算金額').fill(opts.budgetAmount)
  }
  await page.getByRole('button', { name: '建立錢包' }).click()
  await expect(page.getByTestId('current-wallet-name')).toHaveText(opts.name)
}

/** Phase 8 起沒有全域「記帳本」連結了，回首頁一律走底部分頁列。 */
async function goHome(page: Page) {
  await page.getByRole('link', { name: '首頁' }).click()
}

/** Phase 8 起「管理錢包」入口移進了錢包切換 sheet（點錢包名稱開啟）。 */
async function goToWalletsManagement(page: Page) {
  await page.getByTestId('current-wallet-name').click()
  await page.getByRole('link', { name: '管理錢包…' }).click()
}

async function createWallet(
  page: Page,
  opts: { name: string; currency: string; budgetMode: string; budgetAmount: string },
) {
  await goToWalletsManagement(page)
  await page.getByRole('link', { name: '＋ 新增錢包' }).click()
  await page.getByLabel('錢包名稱').fill(opts.name)
  await page.getByLabel('幣別').selectOption(opts.currency)
  await page.getByLabel('預算模式').selectOption(opts.budgetMode)
  if (opts.budgetMode !== 'none') {
    await page.getByLabel('預算金額').fill(opts.budgetAmount)
  }
  await page.getByRole('button', { name: '建立錢包' }).click()
  await goHome(page)
  await expect(page.getByTestId('current-wallet-name')).toHaveText(opts.name)
}

async function addExpense(page: Page, amount: string) {
  await page.getByRole('link', { name: '記一筆' }).click()
  for (const digit of amount) {
    await page.getByTestId(`amount-key-${digit}`).click()
  }
  await page.getByRole('button', { name: '🍜 飲食' }).click()
  await page.getByRole('button', { name: '記一筆' }).click()
}

async function switchToWallet(page: Page, name: string) {
  await goHome(page)
  await goToWalletsManagement(page)
  await page.locator('li').filter({ hasText: name }).getByTestId('switch-wallet').click()
  await goHome(page)
  await expect(page.getByTestId('current-wallet-name')).toHaveText(name)
}

test('E2E-6 — 備份與還原：匯出後在全新裝置匯入，資料與設定完整還原', async ({ page, browser }) => {
  await createFirstWallet(page, {
    name: '日常',
    currency: 'TWD',
    budgetMode: 'weekly',
    budgetAmount: '3000',
  })
  await addExpense(page, '500')
  await addExpense(page, '300')

  await createWallet(page, {
    name: '日本旅遊',
    currency: 'JPY',
    budgetMode: 'total',
    budgetAmount: '200000',
  })
  await addExpense(page, '8000')

  // 變更一個非預設的全域設定，驗證匯入後設定本身也會還原（而不只是資料）。
  await page.getByRole('link', { name: '設定' }).click()
  await page.getByLabel('週起始日').selectOption('0')

  await switchToWallet(page, '日常')
  await expect(page.getByTestId('weekly-balance')).toHaveText('NT$2,200.00')

  await page.getByRole('link', { name: '設定' }).click()
  const downloadPromise = page.waitForEvent('download')
  await page.getByTestId('export-backup-button').click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toMatch(/^expense-backup-\d{8}-\d{4}\.json$/)
  const backupPath = await download.path()
  if (!backupPath) throw new Error('下載檔案沒有本機路徑')

  // 模擬「清除瀏覽器資料換裝置」：全新的 browser context = 全新的 IndexedDB。
  const freshContext = await browser.newContext()
  const freshPage = await freshContext.newPage()
  await freshPage.goto('/')
  await expect(freshPage.getByRole('heading', { name: '建立第一個錢包' })).toBeVisible()

  await freshPage.getByRole('link', { name: '設定' }).click()
  await freshPage.locator('input[name="import-mode"][value="replace"]').check()
  await freshPage.getByTestId('import-file-input').setInputFiles(backupPath)
  await freshPage.getByTestId('replace-confirm-input').fill('確認取代')
  await freshPage.getByTestId('import-backup-button').click()
  await expect(freshPage.getByTestId('import-success')).toBeVisible()

  // 設定還原：週起始日應為匯出當下的「週日」。
  await expect(freshPage.getByLabel('週起始日')).toHaveValue('0')

  // 錢包與交易還原：兩個錢包、餘額與匯出前完全一致。
  await goHome(freshPage)
  await expect(freshPage.getByTestId('current-wallet-name')).toHaveText('日常')
  await expect(freshPage.getByTestId('weekly-balance')).toHaveText('NT$2,200.00')

  await goToWalletsManagement(freshPage)
  await freshPage.locator('li').filter({ hasText: '日本旅遊' }).getByTestId('switch-wallet').click()
  await goHome(freshPage)
  await expect(freshPage.getByTestId('current-wallet-name')).toHaveText('日本旅遊')
  await expect(freshPage.getByTestId('total-balance')).toHaveText('¥192,000')

  await freshContext.close()
})

test('E2E-6 — 匯入 replace 時不輸入確認字串會被拒絕，現有資料不受影響', async ({ page }) => {
  await createFirstWallet(page, {
    name: '日常',
    currency: 'TWD',
    budgetMode: 'weekly',
    budgetAmount: '3000',
  })
  await addExpense(page, '500')

  await page.getByRole('link', { name: '設定' }).click()
  const downloadPromise = page.waitForEvent('download')
  await page.getByTestId('export-backup-button').click()
  const download = await downloadPromise
  const backupPath = await download.path()
  if (!backupPath) throw new Error('下載檔案沒有本機路徑')

  await page.locator('input[name="import-mode"][value="replace"]').check()
  await page.getByTestId('import-file-input').setInputFiles(backupPath)
  // 刻意不輸入確認字串就送出。
  await page.getByTestId('import-backup-button').click()
  await expect(page.getByTestId('import-error')).toBeVisible()

  await goHome(page)
  await expect(page.getByTestId('weekly-balance')).toHaveText('NT$2,500.00')
})

test('E2E-7 — 離線與 PWA：飛航模式下既有資料可讀取，也能正常新增交易', async ({ page, context }) => {
  await createFirstWallet(page, {
    name: '日常',
    currency: 'TWD',
    budgetMode: 'weekly',
    budgetAmount: '3000',
  })
  await addExpense(page, '120')
  await expect(page.getByTestId('weekly-balance')).toHaveText('NT$2,880.00')

  // Service worker 需要先完成安裝／啟用（workbox skipWaiting + clientsClaim），
  // 重新整理一次讓目前分頁被 SW 接管，離線測試才會真的走快取而不是走網路。
  await page.waitForFunction(() => 'serviceWorker' in navigator && !!navigator.serviceWorker.controller, {
    timeout: 30_000,
  })

  const failedRequests: string[] = []
  page.on('requestfailed', (req) => failedRequests.push(req.url()))

  await context.setOffline(true)
  await page.reload()

  await expect(page.getByTestId('bottom-tab-bar')).toBeVisible()
  await expect(page.getByTestId('current-wallet-name')).toHaveText('日常')
  await expect(page.getByTestId('weekly-balance')).toHaveText('NT$2,880.00')
  await expect(page.getByTestId('transaction-item').getByText('NT$120.00')).toBeVisible()

  await addExpense(page, '50')
  await expect(page.getByTestId('weekly-balance')).toHaveText('NT$2,830.00')
  await expect(page.getByTestId('transaction-item').getByText('NT$50.00')).toBeVisible()

  expect(failedRequests).toEqual([])

  await context.setOffline(false)
})

test('E2E-7 — PWA manifest 符合可安裝條件（name / icons / display standalone）', async ({ page }) => {
  await page.goto('/')
  const manifestHref = await page.locator('link[rel="manifest"]').getAttribute('href')
  expect(manifestHref).toBeTruthy()

  const manifestUrl = new URL(manifestHref!, page.url()).toString()
  const manifest = await page.evaluate(async (url) => {
    const res = await fetch(url)
    return res.json()
  }, manifestUrl)

  expect(manifest.name).toBe('記帳本')
  expect(manifest.display).toBe('standalone')
  expect(Array.isArray(manifest.icons)).toBe(true)
  expect(manifest.icons.length).toBeGreaterThan(0)
  for (const icon of manifest.icons) {
    expect(icon.src).toBeTruthy()
    expect(icon.sizes).toMatch(/^\d+x\d+$/)
  }
})

// Phase 7 新增，非 TESTCASES.md 契約項目——深色模式與備份提醒沒有對應的
// 正式測案編號（SPEC.md §6 Phase 7 只列為打磨項目），測試名稱用描述性中文。
test('深色模式：設定頁切換後立即套用 dark class', async ({ page }) => {
  await createFirstWallet(page, {
    name: '日常',
    currency: 'TWD',
    budgetMode: 'weekly',
    budgetAmount: '3000',
  })

  await page.getByRole('link', { name: '設定' }).click()
  await expect(page.locator('html')).not.toHaveClass(/dark/)

  await page.getByTestId('theme-select').selectOption('dark')
  await expect(page.locator('html')).toHaveClass(/dark/)

  await page.getByTestId('theme-select').selectOption('light')
  await expect(page.locator('html')).not.toHaveClass(/dark/)
})

test('備份提醒：首次啟動 7 天內不顯示，滿 7 天後顯示，匯出後消失', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-08-01T00:00:00Z') })
  await createFirstWallet(page, {
    name: '日常',
    currency: 'TWD',
    budgetMode: 'weekly',
    budgetAmount: '3000',
  })

  await page.getByRole('link', { name: '設定' }).click()
  await expect(page.getByTestId('backup-reminder-banner')).toHaveCount(0)

  await page.clock.setFixedTime(new Date('2026-08-09T00:00:00Z'))
  await page.reload()
  await expect(page.getByTestId('backup-reminder-banner')).toBeVisible()

  const downloadPromise = page.waitForEvent('download')
  await page.getByTestId('export-backup-button').click()
  await downloadPromise
  await expect(page.getByTestId('backup-reminder-banner')).toHaveCount(0)
})
