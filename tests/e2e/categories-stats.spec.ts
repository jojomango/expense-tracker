import { test, expect, type Page } from '@playwright/test'

/**
 * Phase 6（分類與統計）自行新增的 E2E 測案。
 *
 * TESTCASES.md 沒有對應本 phase（分類管理 CRUD、統計圖表）的 E2E 契約——
 * TASKS.md 原先標註的「E2E-6」實際上是 TESTCASES.md 的「備份與還原」（Phase 7 範圍），
 * 這是規格與測試契約之間的缺漏，已在 PR 描述的「需要人類決策」段落提出。
 * 依 CLAUDE.md「可以新增 TESTCASES.md 沒有的測案」的原則，補上以下測試涵蓋本 phase 功能，
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
  await page.getByTestId('add-transaction-button').click()
  await page.getByLabel('金額').fill(amount)
  await page.getByLabel('分類').selectOption({ label: categoryLabel })
  if (date) {
    await page.getByLabel('日期').fill(date)
  }
  await page.getByRole('button', { name: '送出' }).click()
}

test('分類管理：新增分類、系統預設分類不可刪除', async ({ page }) => {
  page.on('dialog', (dialog) => dialog.accept())
  await createFirstWallet(page)

  await page.getByRole('link', { name: '分類' }).click()
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

test('分類管理：刪除有交易的自訂分類時，交易轉移到未分類', async ({ page }) => {
  page.on('dialog', (dialog) => dialog.accept())
  await createFirstWallet(page)

  await page.getByRole('link', { name: '分類' }).click()
  await page.getByRole('link', { name: '＋ 新增分類' }).click()
  await page.getByLabel('分類名稱').fill('咖啡')
  await page.getByLabel('Icon（emoji）').fill('☕')
  await page.getByRole('button', { name: '建立分類' }).click()

  await page.getByRole('link', { name: '記帳本' }).click()
  await addExpense(page, '100', '☕ 咖啡')

  const item = page.getByTestId('transaction-item').first()
  await expect(item).toContainText('☕ 咖啡')

  await page.getByRole('link', { name: '分類' }).click()
  await page.getByTestId('category-item').filter({ hasText: '咖啡' }).getByTestId('delete-category').click()
  await expect(page.getByTestId('category-item')).toHaveCount(11)

  await page.getByRole('link', { name: '記帳本' }).click()
  await expect(page.getByTestId('transaction-item').first()).toContainText('未分類')
})

test('統計：本週／本月分類支出佔比與近 8 週趨勢資料正確', async ({ page }) => {
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
