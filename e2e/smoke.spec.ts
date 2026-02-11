import { test, expect } from '@playwright/test'

test.describe('ResoScan smoke tests', () => {
  test('page loads with correct title', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/ResoScan/)
  })

  test('landing page shows heading and start button', async ({ page }) => {
    await page.goto('/')

    // Main heading
    const heading = page.locator('h1')
    await expect(heading).toBeVisible()
    await expect(heading).toContainText('ResoScan')

    // Start button exists and is visible
    const startBtn = page.getByRole('button', { name: /start measurement/i })
    await expect(startBtn).toBeVisible()
  })

  test('clicking start navigates to audio setup', async ({ page }) => {
    await page.goto('/')

    const startBtn = page.getByRole('button', { name: /start measurement/i })
    await startBtn.click()

    // Audio setup screen should appear
    const grantBtn = page.getByRole('button', {
      name: /grant microphone/i,
    })
    await expect(grantBtn).toBeVisible()
  })

  test('footer contains MIT license link', async ({ page }) => {
    await page.goto('/')

    const footer = page.locator('footer, .footer')
    await expect(footer).toBeVisible()
    await expect(footer).toContainText('MIT')
  })

  test('page has no console errors on load', async ({ page }) => {
    const errors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text())
    })

    await page.goto('/')
    await page.waitForLoadState('networkidle')

    expect(errors).toHaveLength(0)
  })
})
