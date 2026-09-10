import { test, expect, type Page } from '@playwright/test'

/**
 * 每日分組與小計 + 備註欄位修正——使用者實際帶著 total 模式的旅行錢包出國記帳後的
 * 回饋（見對話紀錄與 https://claude.ai/code/artifact/97333865-ff5a-409d-bdd4-a52d58a1a8db
 * 的提案預覽），非 TESTCASES.md 契約項目，測試名稱用描述性中文。
 *
 * 這批 e2e 測試是先有互動式調整過的實作、寫完後才第一次執行就過，沒有先看過紅燈
 * 階段——跟 TASKS.md Phase 8 交接筆記記錄過的 T8.3.x 同一種情況（UI 細節邊做邊調），
 * 誠實記錄，不是嚴格 TDD。domain 層的 groupByDay／weekdayLabel 有先紅後綠（見
 * tests/domain/week.test.ts）。
 */

async function createFirstWallet(page: Page, budgetMode: 'total' | 'weekly' = 'total') {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: '建立第一個錢包' })).toBeVisible()

  await page.getByLabel('錢包名稱').fill('日本旅遊')
  await page.getByLabel('幣別').selectOption('JPY')
  await page.getByLabel('預算模式').selectOption(budgetMode)
  if (budgetMode === 'total') {
    await page.getByLabel('預算金額').fill('200000')
  } else {
    await page.getByLabel('預算金額').fill('20000')
  }
  await page.getByRole('button', { name: '建立錢包' }).click()

  await expect(page.getByTestId('current-wallet-name')).toHaveText('日本旅遊')
}

async function addExpense(page: Page, amount: string, date?: string) {
  await page.getByRole('link', { name: '記一筆' }).click()
  for (const digit of amount) {
    await page.getByTestId(`amount-key-${digit}`).click()
  }
  if (date) {
    await page.getByRole('button', { name: '選日期' }).click()
    await page.getByTestId('transaction-date-input').fill(date)
  }
  await page.getByRole('button', { name: '記一筆' }).click()
}

test.describe('交易列表的每日分組與小計', () => {
  test('同一週內兩天的交易，各自出現獨立的日期卡片與小計，週小計不變', async ({ page }) => {
    await page.clock.install({ time: new Date('2026-09-08T12:00:00Z') })
    await createFirstWallet(page)

    await addExpense(page, '1800', '2026-09-08')
    await addExpense(page, '500', '2026-09-08')
    await addExpense(page, '2200', '2026-09-07')

    const dayHeaders = page.getByTestId('day-group-header')
    await expect(dayHeaders).toHaveCount(2)
    await expect(dayHeaders.nth(0)).toContainText('9/8')
    await expect(dayHeaders.nth(0)).toContainText('週二')
    await expect(dayHeaders.nth(1)).toContainText('9/7')
    await expect(dayHeaders.nth(1)).toContainText('週一')

    const daySubtotals = page.getByTestId('day-group-subtotal')
    await expect(daySubtotals.nth(0)).toHaveText('-¥2,300')
    await expect(daySubtotals.nth(1)).toHaveText('-¥2,200')

    // 週小計（既有的 week-group-header 旁邊那個數字）等於兩天合計，完全不受影響。
    await expect(page.locator('[data-testid="week-group-header"] + span')).toHaveText('-¥4,500')
  })

  test('交易列上不再顯示日期，只剩備註（沒有備註時該行不出現）', async ({ page }) => {
    await createFirstWallet(page)
    await addExpense(page, '500')

    const item = page.getByTestId('transaction-item').first()
    await expect(item).not.toContainText('/')
  })

  test('總預算（total 模式）的餘額卡片數字不受每日分組影響', async ({ page }) => {
    await createFirstWallet(page)
    await addExpense(page, '8000')
    await expect(page.getByTestId('total-balance')).toHaveText('¥192,000')
  })
})

test.describe('備註欄位', () => {
  test('按下鍵盤 Enter 會讓備註輸入框失焦（模擬系統鍵盤「完成」鍵收起）', async ({ page }) => {
    await createFirstWallet(page)
    await page.getByRole('link', { name: '記一筆' }).click()
    await page.getByTestId('amount-key-1').click()

    await page.getByRole('button', { name: '＋ 備註' }).click()
    const noteInput = page.getByTestId('transaction-note-input')
    await noteInput.fill('晚餐')
    await expect(noteInput).toBeFocused()

    await noteInput.press('Enter')
    await expect(noteInput).not.toBeFocused()
  })

  test('備註送出後會顯示在交易列上', async ({ page }) => {
    await createFirstWallet(page)
    await page.getByRole('link', { name: '記一筆' }).click()
    await page.getByTestId('amount-key-5').click()
    await page.getByTestId('amount-key-0').click()
    await page.getByTestId('amount-key-0').click()

    await page.getByRole('button', { name: '＋ 備註' }).click()
    await page.getByTestId('transaction-note-input').fill('晚餐')
    await page.getByRole('button', { name: '記一筆' }).click()

    await expect(page.getByTestId('transaction-item').first()).toContainText('晚餐')
  })
})
