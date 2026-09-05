import { test, expect, type Page, type Locator } from '@playwright/test'

/**
 * TESTCASES.md T8.1（記帳流程）、T8.2（交易列表互動）——Phase 9 新增，
 * 對應 UI-SPEC.md §5（記帳頁）、§4.3（交易列表）的介面契約。
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

async function addExpense(page: Page, amount: string, categoryLabel = '🍜 飲食') {
  await page.getByRole('link', { name: '記一筆' }).click()
  for (const digit of amount) {
    await page.getByTestId(`amount-key-${digit}`).click()
  }
  await page.getByRole('button', { name: categoryLabel }).click()
  await page.getByRole('button', { name: '記一筆' }).click()
}

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

test.describe('T8.1 — 記帳流程', () => {
  test('T8.1.1 — 點分頁列中央「＋」進入記帳頁，分頁列不可見', async ({ page }) => {
    await createFirstWallet(page)
    await page.getByRole('link', { name: '記一筆' }).click()
    await expect(page).toHaveURL(/\/transactions\/new/)
    await expect(page.getByTestId('bottom-tab-bar')).toHaveCount(0)
  })

  test('T8.1.2 — 依序按 1 8 0，金額顯示 NT$180', async ({ page }) => {
    await createFirstWallet(page)
    await page.getByRole('link', { name: '記一筆' }).click()
    await page.getByTestId('amount-key-1').click()
    await page.getByTestId('amount-key-8').click()
    await page.getByTestId('amount-key-0').click()
    await expect(page.getByTestId('amount-display')).toHaveText('NT$180')
  })

  test('T8.1.3 — 點分類網格「飲食」出現選取態，且頁面沒有原生 <select>', async ({ page }) => {
    await createFirstWallet(page)
    await page.getByRole('link', { name: '記一筆' }).click()
    await expect(page.locator('select')).toHaveCount(0)

    const food = page.getByRole('button', { name: '🍜 飲食' })
    await food.click()
    await expect(food).toHaveAttribute('aria-pressed', 'true')
  })

  test('T8.1.4 — 點「記一筆」回到首頁，列表出現該筆，toast 顯示已記錄訊息', async ({ page }) => {
    await createFirstWallet(page)
    await addExpense(page, '180', '🍜 飲食')

    await expect(page).toHaveURL(/\/(#\/)?$/)
    await expect(page.getByTestId('transaction-item').first()).toContainText('NT$180.00')
    await expect(page.getByTestId('toast')).toContainText('已記錄 飲食 NT$180')
  })

  test('T8.1.5 — 金額為 0 時「記一筆」鍵被停用，不送出、不跳頁', async ({ page }) => {
    await createFirstWallet(page)
    await page.getByRole('link', { name: '記一筆' }).click()

    const submit = page.getByRole('button', { name: '記一筆' })
    await expect(submit).toBeDisabled()
    await expect(page).toHaveURL(/\/transactions\/new/)
  })

  test('T8.1.6 — 點「昨天」後送出，交易日期為 referenceDate 的前一天', async ({ page }) => {
    await page.clock.install({ time: new Date('2026-09-03T12:00:00Z') })
    await createFirstWallet(page)

    await page.getByRole('link', { name: '記一筆' }).click()
    await page.getByTestId('amount-key-1').click()
    await page.getByRole('button', { name: '昨天' }).click()
    await page.getByRole('button', { name: '記一筆' }).click()

    await expect(page.getByTestId('transaction-item').first()).toContainText('9/2')
  })

  test('T8.1.7 — 記帳頁全程不會把焦點放在文字輸入框（不呼叫系統鍵盤）', async ({ page }) => {
    await createFirstWallet(page)
    await page.getByRole('link', { name: '記一筆' }).click()
    await page.getByTestId('amount-key-1').click()
    await page.getByTestId('amount-key-8').click()
    await page.getByTestId('amount-key-0').click()
    await page.getByRole('button', { name: '🍜 飲食' }).click()
    await page.getByRole('button', { name: '今天' }).click()

    const activeIsTextInput = await page.evaluate(() => {
      const el = document.activeElement
      return el instanceof HTMLInputElement && el.type === 'text'
    })
    expect(activeIsTextInput).toBe(false)

    await page.getByRole('button', { name: '記一筆' }).click()
  })
})

test.describe('T8.2 — 交易列表互動', () => {
  test('T8.2.1 — 未滑動時列表列的 DOM 不含「編輯」或「刪除」文字元素', async ({ page }) => {
    await createFirstWallet(page)
    await addExpense(page, '100')

    await expect(page.getByText('編輯', { exact: true })).toHaveCount(0)
    await expect(page.getByText('刪除', { exact: true })).toHaveCount(0)
  })

  test('T8.2.2 — 點某一列導向該筆的編輯頁', async ({ page }) => {
    await createFirstWallet(page)
    await addExpense(page, '100')

    await page.getByTestId('transaction-item').first().click()
    await expect(page).toHaveURL(/\/transactions\/[^/]+\/edit/)
  })

  test('T8.2.3 — 左滑 100px 後放開，該列露出刪除鍵', async ({ page }) => {
    await createFirstWallet(page)
    await addExpense(page, '100')

    const row = page.getByTestId('transaction-item').first()
    await swipeRow(page, row, -100)
    await expect(page.getByTestId('transaction-delete-action')).toBeVisible()
  })

  test('T8.2.4 — 左滑 20px 後放開，該列歸位，刪除鍵不可見', async ({ page }) => {
    await createFirstWallet(page)
    await addExpense(page, '100')

    const row = page.getByTestId('transaction-item').first()
    await swipeRow(page, row, -20)
    await expect(page.getByTestId('transaction-delete-action')).toHaveCount(0)
  })

  test('T8.2.5 — 展開 A 列後左滑 B 列，A 列自動歸位（同時只有一列展開）', async ({ page }) => {
    await createFirstWallet(page)
    await addExpense(page, '100')
    await addExpense(page, '200')

    const rows = page.getByTestId('transaction-item')
    await swipeRow(page, rows.nth(0), -100)
    await expect(page.getByTestId('transaction-delete-action')).toHaveCount(1)

    await swipeRow(page, rows.nth(1), -100)
    await expect(page.getByTestId('transaction-delete-action')).toHaveCount(1)
  })

  test('T8.2.6 — 點刪除鍵，該筆消失，toast 出現「還原」鍵', async ({ page }) => {
    await createFirstWallet(page)
    await addExpense(page, '100')

    const row = page.getByTestId('transaction-item').first()
    await swipeRow(page, row, -100)
    await page.getByTestId('transaction-delete-action').click()

    await expect(page.getByTestId('transaction-item')).toHaveCount(0)
    await expect(page.getByTestId('toast')).toContainText('還原')
  })

  test('T8.2.7 — 點「還原」，該筆回到列表，金額與分類不變', async ({ page }) => {
    await createFirstWallet(page)
    await addExpense(page, '100')

    const row = page.getByTestId('transaction-item').first()
    await swipeRow(page, row, -100)
    await page.getByTestId('transaction-delete-action').click()
    await page.getByTestId('toast').getByRole('button', { name: '還原' }).click()

    const restored = page.getByTestId('transaction-item').first()
    await expect(restored).toContainText('NT$100.00')
    await expect(restored).toContainText('飲食')
  })

  test('T8.2.8 — 週分組標題文字不符合 YYYY-MM-DD 格式', async ({ page }) => {
    await createFirstWallet(page)
    await addExpense(page, '100')

    const text = await page.getByTestId('week-group-header').first().textContent()
    expect(text ?? '').not.toMatch(/\d{4}-\d{2}-\d{2}/)
  })
})

/**
 * 小數點鍵（PR #11 review 討論後補上，非 TESTCASES.md 契約項目——T7.3/T8.1 全部
 * 案例都只涵蓋整數輸入）：幣別小數位數 > 0 才顯示小數點鍵，輸入的小數會完整送出，
 * 編輯既有交易時也能看到完整小數（不再像最初版本那樣就地四捨五入成整數）。
 */
test.describe('金額鍵台的小數點鍵', () => {
  test('TWD 錢包的鍵台有小數點鍵，輸入 12.5 送出後金額為 NT$12.50', async ({ page }) => {
    await createFirstWallet(page)
    await page.getByRole('link', { name: '記一筆' }).click()

    await expect(page.getByTestId('amount-key-.')).toBeVisible()
    await expect(page.getByTestId('amount-key-00')).toHaveCount(0)

    await page.getByTestId('amount-key-1').click()
    await page.getByTestId('amount-key-2').click()
    await page.getByTestId('amount-key-.').click()
    await page.getByTestId('amount-key-5').click()
    await expect(page.getByTestId('amount-display')).toHaveText('NT$12.5')

    await page.getByRole('button', { name: '🍜 飲食' }).click()
    await page.getByRole('button', { name: '記一筆' }).click()

    await expect(page.getByTestId('transaction-item').first()).toContainText('NT$12.50')
  })

  test('編輯一筆帶小數的交易時，金額鍵台會顯示完整小數（不再被就地四捨五入成整數）', async ({
    page,
  }) => {
    await createFirstWallet(page)
    await page.getByRole('link', { name: '記一筆' }).click()
    await page.getByTestId('amount-key-1').click()
    await page.getByTestId('amount-key-2').click()
    await page.getByTestId('amount-key-.').click()
    await page.getByTestId('amount-key-5').click()
    await page.getByRole('button', { name: '記一筆' }).click()

    await page.getByTestId('transaction-item').first().click()
    await expect(page).toHaveURL(/\/transactions\/[^/]+\/edit/)
    // 送出時已經是最小單位 1250（NT$12.50），編輯時還原回鍵台字串會是完整的 "12.50"，
    // 不是使用者當初輸入的 "12.5"——這是正確的（兩者代表同一個金額），不是 bug。
    await expect(page.getByTestId('amount-display')).toHaveText('NT$12.50')
  })

  test('JPY 錢包（0 小數位）的鍵台沒有小數點鍵，維持 00 鍵', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: '建立第一個錢包' })).toBeVisible()
    await page.getByLabel('錢包名稱').fill('日本旅遊')
    await page.getByLabel('幣別').selectOption('JPY')
    await page.getByLabel('預算模式').selectOption('none')
    await page.getByRole('button', { name: '建立錢包' }).click()
    await expect(page.getByTestId('current-wallet-name')).toHaveText('日本旅遊')

    await page.getByRole('link', { name: '記一筆' }).click()
    await expect(page.getByTestId('amount-key-.')).toHaveCount(0)
    await expect(page.getByTestId('amount-key-00')).toBeVisible()
  })
})
