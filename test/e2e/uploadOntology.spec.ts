import { expect, test } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

// Convert import.meta.url to __dirname equivalent
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

test.describe('Upload ontology from local drive', () => {
  test('Should upload simple ontology and render on ui', async ({ page }) => {
    // Set viewport and navigate to the page, smaller viewports hide UI elements
    await page.setViewportSize({ width: 1920, height: 1080 })

    await page.goto('./?layout=elk&diagramType=flowchart&search=Node')
    await page.click('id=upload-button')
    await page.waitForURL('**/upload')

    expect(await page.isVisible("text='Upload New File'")).toBe(true)

    await page.click('id=upload-file-button')

    expect(await page.isVisible("text='Local Zip File'")).toBe(true)

    const fileChooserPromise = page.waitForEvent('filechooser')
    await page.getByText('Local Zip File').click()
    const fileChooser = await fileChooserPromise
    const filePath = path.join(__dirname, '../../src/lib/server/controllers/__tests__/simple.zip')
    await fileChooser.setFiles(filePath)

    await page.waitForResponse((resp) => resp.url().includes('/update-layout') && resp.status() === 200)

    expect(await page.isVisible("text='dtmi:com:example;1'")).toBe(true)
  })
  test('Should error and show toast to user', async ({ page }) => {
    // Set viewport and navigate to the page, smaller viewports hide UI elements
    await page.setViewportSize({ width: 1920, height: 1080 })

    await page.goto('./?layout=elk&diagramType=flowchart&search=Node')
    await page.click('id=upload-button')
    await page.waitForURL('**/upload')

    expect(await page.isVisible("text='Upload New File'")).toBe(true)

    await page.click('id=upload-file-button')

    expect(await page.isVisible("text='Local Zip File'")).toBe(true)

    const fileChooserPromise = page.waitForEvent('filechooser')
    await page.getByText('Local Zip File').click()
    const fileChooser = await fileChooserPromise
    const filePath = path.join(__dirname, '../../src/lib/server/controllers/__tests__/error.zip')
    await fileChooser.setFiles(filePath)

    await page.waitForResponse((resp) => resp.url().includes('/zip') && resp.status() === 400)

    expect(await page.isVisible("text=''")).toBe(true)
  })
})
