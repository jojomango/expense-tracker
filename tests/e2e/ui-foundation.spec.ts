import { test, expect, type Page } from '@playwright/test'

/**
 * TESTCASES.md T8.3（導覽與圖表，Phase 8 / 10 新增）——T8.3.1~T8.3.3 是 Phase 8
 * 建立的部分（底部分頁列、標題列無底線導覽連結、錢包切換 sheet）；T8.3.4~T8.3.7
 * 是 Phase 10 新增（分類固定色、圓環中心疊字、趨勢圖標籤對齊、可點區域尺寸）。
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

test('T8.3.1 — 首頁標題列不含任何 text-decoration: underline 的導覽連結', async ({ page }) => {
  await createFirstWallet(page, {
    name: '日常',
    currency: 'TWD',
    budgetMode: 'weekly',
    budgetAmount: '3000',
  })

  const titleBar = page.getByTestId('home-title-bar')
  const decorations = await titleBar.locator('a, button').evaluateAll((els) =>
    els.map((el) => getComputedStyle(el).textDecorationLine),
  )
  for (const decoration of decorations) {
    expect(decoration).not.toContain('underline')
  }
})

test('T8.3.2 — 點錢包名稱出現錢包 sheet，列出所有未封存錢包與各自餘額', async ({ page }) => {
  await createFirstWallet(page, {
    name: '日常',
    currency: 'TWD',
    budgetMode: 'weekly',
    budgetAmount: '3000',
  })

  await expect(page.getByTestId('wallet-sheet')).toHaveCount(0)
  await page.getByTestId('current-wallet-name').click()

  const sheet = page.getByTestId('wallet-sheet')
  await expect(sheet).toBeVisible()

  const rows = sheet.getByTestId('wallet-sheet-row')
  await expect(rows).toHaveCount(1)
  await expect(rows.first()).toContainText('日常')
  await expect(rows.first()).toContainText('TWD')
  await expect(rows.first()).toContainText('NT$3,000.00')
  await expect(sheet.getByTestId('wallet-sheet-current-check')).toBeVisible()
})

test('T8.3.3 — 在 sheet 中切換到另一個錢包後，標題、預算卡、交易列表、幣別符號全部更新', async ({
  page,
}) => {
  await createFirstWallet(page, {
    name: '日常',
    currency: 'TWD',
    budgetMode: 'weekly',
    budgetAmount: '3000',
  })

  await page.getByTestId('current-wallet-name').click()
  await page.getByRole('link', { name: '管理錢包…' }).click()
  await page.getByRole('link', { name: '＋ 新增錢包' }).click()
  await page.getByLabel('錢包名稱').fill('日本旅遊')
  await page.getByLabel('幣別').selectOption('JPY')
  await page.getByLabel('預算模式').selectOption('total')
  await page.getByLabel('預算金額').fill('200000')
  await page.getByRole('button', { name: '建立錢包' }).click()
  await page.getByRole('link', { name: '首頁' }).click()
  await expect(page.getByTestId('current-wallet-name')).toHaveText('日本旅遊')

  await page.getByTestId('current-wallet-name').click()
  const rows = page.getByTestId('wallet-sheet-row')
  await rows.filter({ hasText: '日常' }).click()

  await expect(page.getByTestId('wallet-sheet')).toHaveCount(0)
  await expect(page.getByTestId('current-wallet-name')).toHaveText('日常')
  await expect(page.getByTestId('weekly-balance')).toHaveText('NT$3,000.00')
  await expect(page.getByTestId('toast')).toContainText('已切換到 日常')
})

test('底部分頁列可到達首頁與統計，設定不在分頁列上（UI-SPEC.md §3.1）', async ({ page }) => {
  await createFirstWallet(page, {
    name: '日常',
    currency: 'TWD',
    budgetMode: 'weekly',
    budgetAmount: '3000',
  })

  const tabBar = page.getByTestId('bottom-tab-bar')
  await expect(tabBar.getByRole('link', { name: '首頁' })).toBeVisible()
  await expect(tabBar.getByRole('link', { name: '統計' })).toBeVisible()
  await expect(tabBar.getByRole('link', { name: '設定' })).toHaveCount(0)

  await tabBar.getByRole('link', { name: '統計' }).click()
  await expect(page.getByRole('heading', { name: '統計' })).toBeVisible()
  await expect(tabBar).toBeVisible()

  await tabBar.getByRole('link', { name: '記一筆' }).click()
  await expect(page).toHaveURL(/\/transactions\/new/)
  await expect(page.getByTestId('bottom-tab-bar')).toHaveCount(0)
})

async function addExpense(page: Page, amount: string, categoryLabel: string) {
  await page.getByRole('link', { name: '記一筆' }).click()
  for (const digit of amount) {
    await page.getByTestId(`amount-key-${digit}`).click()
  }
  await page.getByRole('button', { name: categoryLabel }).click()
  await page.getByRole('button', { name: '記一筆' }).click()
}

test('T8.3.4 — 統計頁圓環中心可見期間總額文字', async ({ page }) => {
  await createFirstWallet(page, {
    name: '日常',
    currency: 'TWD',
    budgetMode: 'weekly',
    budgetAmount: '3000',
  })
  await addExpense(page, '300', '🍜 飲食')
  await addExpense(page, '200', '🚗 交通')

  await page.getByRole('link', { name: '統計' }).click()
  await expect(page.getByTestId('donut-total')).toBeVisible()
  await expect(page.getByTestId('donut-total')).toHaveText('NT$500.00')
})

test('T8.3.5 — 趨勢圖 8 個週別標籤皆有非零寬度，且與對應柱子中心對齊（差距 < 4px）', async ({
  page,
}) => {
  await createFirstWallet(page, {
    name: '日常',
    currency: 'TWD',
    budgetMode: 'weekly',
    budgetAmount: '3000',
  })
  await addExpense(page, '300', '🍜 飲食')

  await page.getByRole('link', { name: '統計' }).click()
  const bars = page.getByTestId('weekly-trend-bar')
  const labels = page.getByTestId('weekly-trend-label')
  await expect(bars).toHaveCount(8)
  await expect(labels).toHaveCount(8)

  for (let i = 0; i < 8; i++) {
    const barBox = await bars.nth(i).boundingBox()
    const labelBox = await labels.nth(i).boundingBox()
    expect(barBox).not.toBeNull()
    expect(labelBox).not.toBeNull()
    expect(labelBox!.width).toBeGreaterThan(0)
    const barCenterX = barBox!.x + barBox!.width / 2
    const labelCenterX = labelBox!.x + labelBox!.width / 2
    expect(Math.abs(barCenterX - labelCenterX)).toBeLessThan(4)
  }
})

test('T8.3.6 — 切到本月再切回本週，同一分類的圖例顏色不變', async ({ page }) => {
  await createFirstWallet(page, {
    name: '日常',
    currency: 'TWD',
    budgetMode: 'weekly',
    budgetAmount: '3000',
  })
  await addExpense(page, '300', '🍜 飲食')

  await page.getByRole('link', { name: '統計' }).click()
  const foodLegend = page.getByTestId('category-pie-legend-item').filter({ hasText: '飲食' })
  const colorBefore = await foodLegend.getAttribute('data-color')
  expect(colorBefore).toBe('#c1502e')

  await page.getByTestId('range-month').click()
  const colorAtMonth = await foodLegend.getAttribute('data-color')
  expect(colorAtMonth).toBe(colorBefore)

  await page.getByTestId('range-week').click()
  const colorBack = await foodLegend.getAttribute('data-color')
  expect(colorBack).toBe(colorBefore)
})

test('T8.3.7 — 統計頁分段控制與分類色票的可點區域皆 ≥ 44×44px', async ({ page }) => {
  await createFirstWallet(page, {
    name: '日常',
    currency: 'TWD',
    budgetMode: 'weekly',
    budgetAmount: '3000',
  })

  await page.getByRole('link', { name: '統計' }).click()
  for (const testId of ['range-week', 'range-month']) {
    const box = await page.getByTestId(testId).boundingBox()
    expect(box).not.toBeNull()
    expect(box!.width).toBeGreaterThanOrEqual(44)
    expect(box!.height).toBeGreaterThanOrEqual(44)
  }

  await page.getByRole('link', { name: '首頁' }).click()
  await page.getByTestId('settings-link').click()
  await page.getByTestId('categories-entry').click()
  await page.getByRole('link', { name: '＋ 新增分類' }).click()

  const swatch = page.getByTestId('category-color-swatch').first()
  const swatchBox = await swatch.boundingBox()
  expect(swatchBox).not.toBeNull()
  expect(swatchBox!.width).toBeGreaterThanOrEqual(44)
  expect(swatchBox!.height).toBeGreaterThanOrEqual(44)
})

test('分頁列、錢包 sheet、FAB 的可點區域皆 ≥ 44×44px（UI-SPEC.md §1.2）', async ({ page }) => {
  await createFirstWallet(page, {
    name: '日常',
    currency: 'TWD',
    budgetMode: 'weekly',
    budgetAmount: '3000',
  })

  const targets = [
    page.getByTestId('bottom-tab-bar').getByRole('link', { name: '首頁' }),
    page.getByTestId('bottom-tab-bar').getByRole('link', { name: '統計' }),
    page.getByTestId('bottom-tab-bar').getByRole('link', { name: '記一筆' }),
  ]
  for (const target of targets) {
    const box = await target.boundingBox()
    expect(box).not.toBeNull()
    expect(box!.width).toBeGreaterThanOrEqual(44)
    expect(box!.height).toBeGreaterThanOrEqual(44)
  }

  await page.getByTestId('current-wallet-name').click()
  const row = page.getByTestId('wallet-sheet-row').first()
  const rowBox = await row.boundingBox()
  expect(rowBox).not.toBeNull()
  expect(rowBox!.height).toBeGreaterThanOrEqual(44)
})
