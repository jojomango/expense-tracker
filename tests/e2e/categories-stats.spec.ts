import { test, expect, type Page } from '@playwright/test'

/**
 * TESTCASES.md E2E-8、E2E-9、E2E-10（分類與統計，Phase 6 新增）。
 *
 * 這三個測案原本不存在於 TESTCASES.md——TASKS.md 曾誤標 Phase 6 對應「E2E-6」，
 * 但那其實是「備份與還原」的官方契約（Phase 7 範圍）。經人類決策後正式編號收錄。
 * 圖表本身不做像素比對，只驗證資料正確（透過 data-testid 屬性讀取數值）。
 */

async function createFirstWallet(page: Page) {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: '建立第一個錢包' })).toBeVisible()

  await page.getByLabel('錢包名稱').fill('日常')
  await page.getByLabel('幣別').selectOption('TWD')
  await page.getByLabel('預算模式').selectOption('weekly')
  await page.getByLabel('預算金額').fill('3000')
  await page.getByRole('button', { name: '建立錢包' }).click()

  await expect(page.getByTestId('current-wallet-name')).toHaveText('日常')
}

async function addExpense(page: Page, amount: string, categoryLabel: string, date?: string) {
  await page.getByRole('link', { name: '記一筆' }).click()
  for (const digit of amount) {
    await page.getByTestId(`amount-key-${digit}`).click()
  }
  await page.getByRole('button', { name: categoryLabel }).click()
  if (date) {
    await page.getByRole('button', { name: '選日期' }).click()
    await page.getByTestId('transaction-date-input').fill(date)
  }
  await page.getByRole('button', { name: '記一筆' }).click()
}

/** Phase 8 起「分類管理」入口移進了設定頁（見 Settings.tsx 的「分類管理」列）。 */
async function goToCategories(page: Page) {
  await page.getByTestId('settings-link').click()
  await page.getByTestId('categories-entry').click()
}

/** Phase 8 起沒有全域「記帳本」連結了，回首頁一律走底部分頁列。 */
async function goHome(page: Page) {
  await page.getByRole('link', { name: '首頁' }).click()
}

test('E2E-8 — 分類管理：新增分類、系統預設分類不可刪除', async ({ page }) => {
  page.on('dialog', (dialog) => dialog.accept())
  await createFirstWallet(page)

  await goToCategories(page)
  await expect(page.getByRole('heading', { name: '分類管理' })).toBeVisible()
  await expect(page.getByTestId('category-item')).toHaveCount(11)

  await page.getByRole('link', { name: '＋ 新增分類' }).click()
  await page.getByLabel('分類名稱').fill('咖啡')
  await page.getByLabel('Icon（emoji）').fill('☕')
  await page.getByRole('button', { name: '建立分類' }).click()

  await expect(page.getByTestId('category-item')).toHaveCount(12)
  await expect(page.getByText('☕ 咖啡')).toBeVisible()

  const foodItem = page.getByTestId('category-item').filter({ hasText: '飲食' })
  await foodItem.getByTestId('delete-category').click()

  // 系統預設分類刪除會被拒絕（DefaultCategoryError → window.alert），數量與項目應維持不變。
  await expect(page.getByTestId('category-item')).toHaveCount(12)
  await expect(page.getByText('🍜 飲食')).toBeVisible()
})

test('E2E-9 — 分類管理：刪除有交易的自訂分類時，交易轉移到未分類', async ({ page }) => {
  page.on('dialog', (dialog) => dialog.accept())
  await createFirstWallet(page)

  await goToCategories(page)
  await page.getByRole('link', { name: '＋ 新增分類' }).click()
  await page.getByLabel('分類名稱').fill('咖啡')
  await page.getByLabel('Icon（emoji）').fill('☕')
  await page.getByRole('button', { name: '建立分類' }).click()

  await goHome(page)
  await addExpense(page, '100', '☕ 咖啡')

  const item = page.getByTestId('transaction-item').first()
  await expect(item).toContainText('咖啡')

  await goToCategories(page)
  await page.getByTestId('category-item').filter({ hasText: '咖啡' }).getByTestId('delete-category').click()
  await expect(page.getByTestId('category-item')).toHaveCount(11)

  await goHome(page)
  await expect(page.getByTestId('transaction-item').first()).toContainText('未分類')
})

test('E2E-10 — 統計：本週／本月分類支出佔比與近 8 週趨勢資料正確', async ({ page }) => {
  // weekStartDay 預設為 1（週一），今天 2026-08-11（二）→ 本週 2026-08-10 ~ 2026-08-16。
  await page.clock.install({ time: new Date('2026-08-11T12:00:00Z') })
  await createFirstWallet(page)

  await addExpense(page, '300', '🍜 飲食')
  await addExpense(page, '200', '🚗 交通')
  // 本週之前、但同月份的一筆支出：只應計入「本月」，不計入「本週」。
  await addExpense(page, '100', '🍜 飲食', '2026-08-05')

  await page.getByRole('link', { name: '統計' }).click()
  await expect(page.getByRole('heading', { name: '統計' })).toBeVisible()

  const foodLegend = page.getByTestId('category-pie-legend-item').filter({ hasText: '飲食' })
  const transportLegend = page.getByTestId('category-pie-legend-item').filter({ hasText: '交通' })

  // 本週（預設）：飲食 300、交通 200，共 500 → 60% / 40%。
  await expect(foodLegend).toContainText('NT$300.00')
  await expect(foodLegend).toContainText('60%')
  await expect(transportLegend).toContainText('NT$200.00')
  await expect(transportLegend).toContainText('40%')

  await page.getByTestId('range-month').click()

  // 本月：飲食 300+100=400、交通 200，共 600 → 66.67% / 33.33%。
  await expect(foodLegend).toContainText('NT$400.00')
  await expect(foodLegend).toContainText('66.67%')
  await expect(transportLegend).toContainText('33.33%')

  const bars = page.getByTestId('weekly-trend-bar')
  await expect(bars).toHaveCount(8)
  await expect(bars.last()).toHaveAttribute('data-amount', '50000') // 本週：300+200=500 元
  await expect(bars.nth(6)).toHaveAttribute('data-amount', '10000') // 上週：100 元
  await expect(bars.nth(0)).toHaveAttribute('data-amount', '0')
})
