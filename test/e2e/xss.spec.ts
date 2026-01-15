import { expect, test } from '@playwright/test'
import { visualisationUIWiremockPort } from '../globalSetup'
import { waitForUpdateLayout } from './helpers/waitForHelpers'

test.describe('xss-vulnerabilities', () => {
  test.use({ baseURL: `http://localhost:${visualisationUIWiremockPort}` })

  const payloads = [
    `<script>alert('XSS')</script>`,
    `<img src='x' onerror='alert("XSS")'>`,
    `<div onclick='alert("XSS")'>Click me</div>`,
  ]
  payloads.forEach((payload) => {
    test(`xss attack with payload ${payload}`, async ({ page }) => {
      let dialogTriggered = false

      page.on('dialog', async (dialog) => {
        dialogTriggered = true
        await dialog.dismiss()
      })

      await page.goto('./')
      await page.waitForSelector(`text='ACDCTerminal'`)

      await waitForUpdateLayout(page, () => page.fill('#search', payload))

      expect(dialogTriggered).toBe(false)
    })
  })
})
