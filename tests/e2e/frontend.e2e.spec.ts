import { test, expect } from '@playwright/test'

test.describe('Frontend', () => {
  test('shows the landing page with both ways in', async ({ page }) => {
    await page.goto('http://localhost:3000')

    await expect(page).toHaveTitle(/1geladen/)
    await expect(page.locator('h1')).toContainText('Events organisieren wie 2010')

    // The two entry points for anyone without a session.
    await expect(page.getByRole('link', { name: 'Ich will mitfeiern' })).toHaveAttribute(
      'href',
      '/register',
    )
    await expect(page.getByRole('link', { name: 'Ich habe schon ein Konto' })).toHaveAttribute(
      'href',
      '/login',
    )
  })
})
