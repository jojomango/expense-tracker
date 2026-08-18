import { test, expect, type Page } from '@playwright/test'

/**
 * TESTCASES.md E2E-1、E2E-2。
 * 每個測試從乾淨的 IndexedDB 開始（Playwright 預設每個測試獨立瀏覽器 context）。
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

test('E2E-1 — 首次使用：引導建立第一個錢包', async ({ page }) => {
  await createFirstWallet(page)

  await expect(page.getByTestId('weekly-balance')).toHaveText('NT$3,000.00')

  await page.getByTestId('add-transaction-button').click()
  const categorySelect = page.getByLabel('分類')

  const expenseOptions = await categorySelect.locator('option').allTextContents()
  expect(expenseOptions).toHaveLength(7)

  await page.getByTestId('type-income').click()
  const incomeOptions = await categorySelect.locator('option').allTextContents()
  expect(incomeOptions).toHaveLength(4)
})

test('E2E-2 — 記一筆帳：新增／編輯／刪除交易即時更新餘額', async ({ page }) => {
  await createFirstWallet(page)
  await expect(page.getByTestId('weekly-balance')).toHaveText('NT$3,000.00')

  await page.getByTestId('add-transaction-button').click()
  await page.getByLabel('金額').fill('120')
  await page.getByLabel('分類').selectOption({ label: '🍜 飲食' })
  await page.getByRole('button', { name: '送出' }).click()

  const firstItem = page.getByTestId('transaction-list').getByTestId('transaction-item').first()
  await expect(firstItem).toContainText('NT$120.00')
  await expect(firstItem).toContainText('🍜 飲食')
  await expect(page.getByTestId('weekly-balance')).toHaveText('NT$2,880.00')

  await firstItem.getByTestId('edit-transaction').click()
  await page.getByLabel('金額').fill('200')
  await page.getByRole('button', { name: '送出' }).click()

  await expect(page.getByTestId('weekly-balance')).toHaveText('NT$2,800.00')

  page.once('dialog', (dialog) => dialog.accept())
  await firstItem.getByTestId('delete-transaction').click()

  await expect(page.getByText('NT$200.00')).toHaveCount(0)
  await expect(page.getByTestId('weekly-balance')).toHaveText('NT$3,000.00')
})
