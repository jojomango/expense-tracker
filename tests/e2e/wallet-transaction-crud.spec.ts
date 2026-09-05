import { test, expect, type Page, type Locator } from '@playwright/test'

/**
 * TESTCASES.md E2E-1、E2E-2。
 * 每個測試從乾淨的 IndexedDB 開始（Playwright 預設每個測試獨立瀏覽器 context）。
 *
 * Phase 9 起「記一筆」入口改為底部分頁列的中央 FAB（aria-label「記一筆」），
 * 金額輸入改為數字鍵台（見 amount-key-* 系列 testid），分類改為網格按鈕
 * （accessible name 與原本 <select> 的 option 文字相同，例如「🍜 飲食」），
 * 交易列表列上不再有「編輯」「刪除」文字鍵，改為左滑露出的
 * `transaction-delete-action`（詳見 UI-SPEC.md §4.3、§5，TASKS.md Phase 9）。
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

async function pressAmountDigits(page: Page, amount: string) {
  for (const digit of amount) {
    await page.getByTestId(`amount-key-${digit}`).click()
  }
}

/** 左滑一列交易，露出刪除鍵；dx 為負數代表向左拖曳的像素距離。 */
async function swipeRow(page: Page, row: Locator, dx: number) {
  const box = await row.boundingBox()
  if (!box) throw new Error('找不到交易列的位置')
  const y = box.y + box.height / 2
  const startX = box.x + box.width / 2
  await page.mouse.move(startX, y)
  await page.mouse.down()
  await page.mouse.move(startX + dx, y, { steps: 10 })
  await page.mouse.up()
}

test('E2E-1 — 首次使用：引導建立第一個錢包', async ({ page }) => {
  await createFirstWallet(page)

  await expect(page.getByTestId('weekly-balance')).toHaveText('NT$3,000.00')

  await page.getByRole('link', { name: '記一筆' }).click()
  await expect(page.getByTestId('category-option')).toHaveCount(7)

  await page.getByTestId('type-income').click()
  await expect(page.getByTestId('category-option')).toHaveCount(4)
})

test('E2E-2 — 記一筆帳：新增／編輯／刪除交易即時更新餘額', async ({ page }) => {
  await createFirstWallet(page)
  await expect(page.getByTestId('weekly-balance')).toHaveText('NT$3,000.00')

  await page.getByRole('link', { name: '記一筆' }).click()
  await pressAmountDigits(page, '120')
  await page.getByRole('button', { name: '🍜 飲食' }).click()
  await page.getByRole('button', { name: '記一筆' }).click()

  const firstItem = page.getByTestId('transaction-list').getByTestId('transaction-item').first()
  await expect(firstItem).toContainText('NT$120.00')
  await expect(firstItem).toContainText('飲食')
  await expect(page.getByTestId('weekly-balance')).toHaveText('NT$2,880.00')

  await firstItem.click()
  await expect(page).toHaveURL(/\/transactions\/[^/]+\/edit/)
  await page.getByTestId('amount-key-back').click()
  await page.getByTestId('amount-key-back').click()
  await page.getByTestId('amount-key-back').click()
  await pressAmountDigits(page, '200')
  await page.getByRole('button', { name: '儲存' }).click()

  await expect(page.getByTestId('weekly-balance')).toHaveText('NT$2,800.00')

  const item = page.getByTestId('transaction-item').first()
  await swipeRow(page, item, -100)
  await page.getByTestId('transaction-delete-action').click()

  await expect(page.getByText('NT$200.00')).toHaveCount(0)
  await expect(page.getByTestId('weekly-balance')).toHaveText('NT$3,000.00')
})
