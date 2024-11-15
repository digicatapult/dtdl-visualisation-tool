import { expect, test } from '@playwright/test'

test.describe('xss-vulnerabilities', () => {
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
      await page.fill('#search', payload)

      await page.waitForTimeout(2000)

      expect(dialogTriggered).toBe(false)
    })
  })
})
