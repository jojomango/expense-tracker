import { test, expect, type Page } from '@playwright/test'

/**
 * TESTCASES.md E2E-3、E2E-4、E2E-5。
 * 每個測試從乾淨的 IndexedDB 開始（Playwright 預設每個測試獨立瀏覽器 context）。
 */

async function createFirstWallet(page: Page, budgetAmount = '3000') {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: '建立第一個錢包' })).toBeVisible()

  await page.getByLabel('錢包名稱').fill('日常')
  await page.getByLabel('幣別').selectOption('TWD')
  await page.getByLabel('預算模式').selectOption('weekly')
  await page.getByLabel('預算金額').fill(budgetAmount)
  await page.getByRole('button', { name: '建立錢包' }).click()

  await expect(page.getByTestId('current-wallet-name')).toHaveText('日常')
}

async function addExpense(page: Page, amount: string, date?: string) {
  await page.getByTestId('add-transaction-button').click()
  await page.getByLabel('金額').fill(amount)
  await page.getByLabel('分類').selectOption({ label: '🍜 飲食' })
  if (date) {
    await page.getByLabel('日期').fill(date)
  }
  await page.getByRole('button', { name: '送出' }).click()
}

test('E2E-3 — 超支警示：紅色樣式、警示圖示與已超支標示', async ({ page }) => {
  await createFirstWallet(page)
  await addExpense(page, '2900')
  await expect(page.getByTestId('weekly-balance')).toHaveText('NT$100.00')

  await addExpense(page, '500')

  const balance = page.getByTestId('weekly-balance')
  await expect(balance).toHaveText('-NT$400.00')
  await expect(balance).toHaveClass(/text-red-600/)
  await expect(page.getByTestId('over-budget-icon')).toBeVisible()
  await expect(page.getByText('已超支')).toBeVisible()
})

test('E2E-4 — 多錢包與多幣別：餘額互不影響', async ({ page }) => {
  await createFirstWallet(page)
  await addExpense(page, '500')
  await expect(page.getByTestId('weekly-balance')).toHaveText('NT$2,500.00')

  await page.getByRole('link', { name: '管理錢包' }).click()
  await page.getByRole('link', { name: '＋ 新增錢包' }).click()
  await page.getByLabel('錢包名稱').fill('日本旅遊')
  await page.getByLabel('幣別').selectOption('JPY')
  await page.getByLabel('預算模式').selectOption('total')
  await page.getByLabel('預算金額').fill('200000')
  await page.getByRole('button', { name: '建立錢包' }).click()

  await page.getByRole('link', { name: '記帳本' }).click()
  await expect(page.getByTestId('current-wallet-name')).toHaveText('日本旅遊')
  await expect(page.getByTestId('total-balance')).toHaveText('¥200,000')
  await expect(page.getByText('本錢包還沒有任何交易')).toBeVisible()

  await addExpense(page, '8000')
  await expect(page.getByTestId('total-balance')).toHaveText('¥192,000')
  await expect(page.getByText('已用 4%')).toBeVisible()

  await page.getByRole('link', { name: '管理錢包' }).click()
  await page
    .locator('li')
    .filter({ hasText: '日常' })
    .getByTestId('switch-wallet')
    .click()

  await page.getByRole('link', { name: '記帳本' }).click()
  await expect(page.getByTestId('current-wallet-name')).toHaveText('日常')
  await expect(page.getByTestId('weekly-balance')).toHaveText('NT$2,500.00')
  await expect(page.getByText('跨幣別', { exact: false })).toHaveCount(0)
})

test('E2E-5 — 週起始日設定：變更即時重算週餘額與分組', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-08-11T12:00:00Z') })
  await createFirstWallet(page)

  await addExpense(page, '1000', '2026-08-09')
  await addExpense(page, '500', '2026-08-10')

  await expect(page.getByTestId('weekly-balance')).toHaveText('NT$2,500.00')

  await page.getByRole('link', { name: '設定' }).click()
  await expect(page.getByRole('heading', { name: '設定' })).toBeVisible()
  await page.getByLabel('週起始日').selectOption('0')

  await page.getByRole('link', { name: '記帳本' }).click()
  await expect(page.getByTestId('weekly-balance')).toHaveText('NT$1,500.00')

  const headers = page.getByTestId('week-group-header')
  await expect(headers).toHaveCount(1)
  await expect(headers.first()).toContainText('2026-08-09')
  await expect(headers.first()).toContainText('2026-08-15')

  await expect(page.getByText('NT$1,000.00')).toBeVisible()
  await expect(page.getByText('NT$500.00')).toBeVisible()
})
