import { expect, test } from '@playwright/test'
import { waitForUpdateLayout } from './helpers/waitForHelpers'

test.describe('file tree', () => {
  test('no interface/relationship selected', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto('./')
    await page.waitForSelector(`text='Terminal'`)

    await page.click('#navigation-panel-button')
    //await page.waitForTimeout(1000) // wait for animation
    const navigationPanelTree = page.locator('#navigation-panel-tree')

    // defaults to file tree
    const fileName = navigationPanelTree.getByText('Bay.json', { exact: true })
    await expect(fileName).toBeInViewport()

    // expand to show interface in file
    await fileName.click()
    const interfaceName = navigationPanelTree.getByText('Bay', { exact: true })
    await expect(interfaceName).toBeInViewport()

    // expand to show properties + relationship in file
    await interfaceName.click()
    await expect(navigationPanelTree.getByText('bayEnergyMeasFlag', { exact: true })).toBeInViewport()
    await expect(navigationPanelTree.getByText('memberOfSubstation', { exact: true })).toBeInViewport()

    // unexpand
    await fileName.click()
    const a = navigationPanelTree.getByText('Bay', { exact: true })
    await expect(a).not.toBeInViewport()

    // file in nested directory
    await navigationPanelTree.getByText('root', { exact: true }).click()
    await navigationPanelTree.getByText('nested', { exact: true }).click()
    await expect(navigationPanelTree.getByText('IdentifiedObject.json', { exact: true })).toBeInViewport()
  })

  test('interface selected', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto('./')
    await page.waitForSelector(`text='Terminal'`)

    await waitForUpdateLayout(page, () => page.locator('#mermaid-output').getByText('Bay', { exact: true }).click())
    const navigationPanelTree = page.locator('#navigation-panel-tree')

    // shows file tree with file expanded and interface highlighted
    await expect(navigationPanelTree.getByText('memberOfSubstation', { exact: true })).toBeInViewport()

    const interfaceName = navigationPanelTree.getByText('Bay', { exact: true })
    await expect(interfaceName).toBeInViewport()
    expect(interfaceName).toHaveCSS('background-color', 'rgb(251, 242, 145)')

    // shows details
    await page.locator('#navigation-panel').getByText('Details', { exact: true }).click()
    await expect(
      page.locator('#navigation-panel-details').getByText('Basic Information', { exact: true })
    ).toBeInViewport()

    // stays on details tab when different interface selected
    await waitForUpdateLayout(page, () =>
      page.locator('#mermaid-output').getByText('ACDCTerminal', { exact: true }).click()
    )
    await expect(
      page.locator('#navigation-panel-details').getByText('Basic Information', { exact: true })
    ).toBeInViewport()
  })

  test('relationship selected', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto('./')
    await page.waitForSelector(`text='Terminal'`)

    for (let i = 0; i < 10; i++) {
      await page.locator('#zoom-out').click()
    }

    await waitForUpdateLayout(page, () =>
      page.locator('#mermaid-output').getByText('CurveDatas', { exact: true }).click()
    )
    const navigationPanelTree = page.locator('#navigation-panel-tree')

    // shows file tree with file expanded and relationship highlighted
    const interfaceName = navigationPanelTree.getByText('CurveDatas', { exact: true })
    await expect(interfaceName).toBeInViewport()
    expect(interfaceName).toHaveCSS('background-color', 'rgb(251, 242, 145)')
  })
})
