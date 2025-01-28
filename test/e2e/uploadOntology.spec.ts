import { expect, test } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

// Convert import.meta.url to __dirname equivalent
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

test.describe('Upload ontology from local drive', () => {
  test('Should error and show toast to user', async ({ page }) => {
    // Set viewport and navigate to the page, smaller viewports hide UI elements
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto('./?layout=elk&diagramType=flowchart&search=Node')

    expect(await page.isVisible("text='Upload Ontology'")).toBe(true)

    // click upload ontology and wait for file to load dtdl
    await page.click('id=upload-button')
    const filePath = path.join(__dirname, '../../src/lib/server/controllers/__tests__/error.zip')
    await page.setInputFiles('input[type="file"]', filePath)
    await Promise.all([await page.waitForResponse((resp) => resp.url().includes('/upload') && resp.status() === 400)])

    expect(await page.isVisible("text='Failed to parse DTDL model'")).toBe(true)
  })
  test('Should upload simple ontology and render on ui, go to page and render default ontology and make changes', async ({
    page,
  }) => {
    // Set viewport and navigate to the page, smaller viewports hide UI elements
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto('./?layout=elk&diagramType=flowchart&search=Node')

    expect(await page.isVisible("text='Upload Ontology'")).toBe(true)

    // click upload ontology and wait for file to load dtdl
    const filePath = path.join(__dirname, '../../src/lib/server/controllers/__tests__/simple.zip')
    await page.getByLabel('Upload Ontology').setInputFiles(filePath)
    await Promise.all([page.waitForResponse((resp) => resp.url().includes('/update-layout') && resp.status() === 200)])
    await page.waitForTimeout(5000)
    expect(await page.isVisible("text='dtmi:com:example;1'")).toBe(true)

    await page.goto('./')
    await page.waitForResponse((resp) => resp.url().includes('/update-layout') && resp.status() === 200)
    await page.waitForTimeout(5000)
    expect(await page.isVisible("text='ConnectivityNodeContainer'")).toBe(true)

    // check classDiagram functionality
    await page.getByLabel('Diagram Type').selectOption('classDiagram')
    await Promise.all([page.waitForResponse((resp) => resp.url().includes('/update-layout') && resp.status() === 200)])
    await page.waitForTimeout(5000)
    expect(await page.isVisible("text='mRID'")).toBe(true)

    // Test search functionality works

    await page.focus('#search')
    await Promise.all([
      page.waitForResponse((resp) => resp.url().includes('/update-layout') && resp.status() === 200),
      page.fill('#search', 'Container'),
    ])
    await page.waitForTimeout(500)

    expect(await page.isVisible("text='EquipmentContainer'")).toBe(true)
  })
})
