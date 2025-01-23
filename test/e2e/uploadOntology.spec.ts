import { expect, test } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

// Convert import.meta.url to __dirname equivalent
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

test.describe('redirect to open ontology page', () => {
    test('click on upload ontology', async ({ page }) => {
        await page.setViewportSize({ width: 1920, height: 1080 })
        await page.goto('./?layout=elk&diagramType=flowchart&search=Node')
        await page.waitForSelector("text='ConnectivityNodeContainer'")

        await page.click("id=upload-button")

        expect(await page.isVisible("text='Upload New File'")).toBe(true)

        await page.click("id=upload-file-button")

        expect(await page.isVisible("text='Local Zip File'")).toBe(true)

        await page.click("id=zip-button")

        const filePath = path.join(__dirname, '../../src/lib/server/controllers/__tests__/simple.zip')

        await page.setInputFiles("id=zip", filePath)

        await page.waitForSelector("id=")

        expect(await page.isVisible("text='dtmi:com:example:1'")).toBe(true)




    })
})