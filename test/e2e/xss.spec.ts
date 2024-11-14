import { expect, test } from '@playwright/test'

test.describe('homepage redirect', () => {
  test(`url is as expected'`, async ({ page }) => {
    const baseUrl = 'http://127.0.0.1:3000'
    const expectedUrl = `${baseUrl}/?search=&highlightNodeId=&lastSearch=&diagramType=flowchart&layout=elk&output=svg`

    await page.goto(baseUrl, {
      waitUntil: 'networkidle',
    })

    const url = page.url()
    expect(url).toContain(expectedUrl)
  })

  const payloads = [
    `<script>alert('XSS')</script>`,
    `<img src='x' onerror='alert(\"XSS\")'>`,
    `<div onclick=\'alert("XSS")\'>Click me</div>`,
  ]
  payloads.forEach((payload) => {
    test(`xss attack with payload ${payload}`, async ({ page }) => {
      const baseUrl = 'http://127.0.0.1:3000'
      await page.goto(baseUrl, {
        waitUntil: 'networkidle',
      })

      await page.fill('#search', payload)
      await page.waitForLoadState('networkidle')

      const alertMessage = await page.evaluate(() => {
        return new Promise((resolve) => {
          window.alert = resolve
        })
      })
      expect(alertMessage).toBeUndefined()
    })
  })
})
