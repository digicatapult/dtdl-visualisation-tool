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
    await Promise.all([
      page.waitForResponse((resp) => resp.url().includes('/update-layout') && resp.status() === 200),
      page.goto('./'),
    ])

    expect(await page.isVisible("text='Upload Ontology'")).toBe(true)

    // Upload ontology and wait for file to load dtdl
    const filePath = path.join(__dirname, '../../src/lib/server/controllers/__tests__/error.zip')
    await Promise.all([
      page.waitForResponse((resp) => resp.url().includes('/upload') && resp.status() === 400),
      page.waitForResponse((resp) => resp.url().includes('/warning.svg')),
      page.getByLabel('Upload Ontology').setInputFiles(filePath),
    ])

    expect(await page.isVisible("text='Failed to parse DTDL model'")).toBe(true)
  })
  test('Should upload simple ontology and render on ui, go to page and render default ontology and make changes', async ({
    page,
  }) => {
    // Set viewport and navigate to the page, smaller viewports hide UI elements
    await page.setViewportSize({ width: 1920, height: 1080 })
    await Promise.all([
      page.waitForResponse((resp) => resp.url().includes('/update-layout') && resp.status() === 200),
      page.goto('./'),
    ])
    await page.locator('#mermaid-output #mermaid-svg').waitFor({ state: 'visible' })
    expect(await page.isVisible("text='Upload Ontology'")).toBe(true)

    // Upload ontology and wait for file to load dtdl
    const filePath = path.join(__dirname, '../../src/lib/server/controllers/__tests__/simple.zip')
    await Promise.all([
      page.waitForResponse((resp) => resp.url().includes('/update-layout') && resp.status() === 200),
      page.getByLabel('Upload Ontology').setInputFiles(filePath),
    ])
    await page.locator('#mermaid-output #mermaid-svg').waitFor({ state: 'visible' })
    expect(await page.isVisible("text='dtmi:com:example;1'")).toBe(true)

    // Check classDiagram functionality
    await Promise.all([
      page.waitForResponse((resp) => resp.url().includes('/update-layout') && resp.status() === 200),
      page.getByLabel('Diagram Type').selectOption('classDiagram'),
    ])
    await page.locator('#mermaid-output #mermaid-svg').waitFor({ state: 'visible' })
    await expect(await page.locator('#mermaid-output #mermaid-svg')).toHaveClass('classDiagram')

    // Render root page and test if default dtdl has loaded
    await Promise.all([
      page.waitForResponse((resp) => resp.url().includes('/update-layout') && resp.status() === 200),
      page.goto('./'),
    ])
    await page.locator('#mermaid-output #mermaid-svg').waitFor({ state: 'visible' })
    expect(await page.isVisible("text='ConnectivityNodeContainer'")).toBe(true)

    // Check classDiagram functionality
    await Promise.all([
      page.waitForResponse((resp) => resp.url().includes('/update-layout') && resp.status() === 200),
      page.getByLabel('Diagram Type').selectOption('classDiagram'),
    ])
    await page.locator('#mermaid-output #mermaid-svg').waitFor({ state: 'visible' })
    expect(await page.isVisible("text='mRID'")).toBe(true)
  })
})
