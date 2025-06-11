import { expect, test } from '@playwright/test'
import { waitForUpdateLayout } from './helpers/waitForHelpers'

test.describe('file tree', () => {
  test('no interface/relationship selected', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto('./')

    await page.click('#navigation-panel-button')
    const navigationPanel = page.locator('#navigation-panel-content')

    // defaults to file tree
    const fileName = navigationPanel.getByText('Bay.json', { exact: true })
    await expect(fileName).toBeVisible()

    // expand to show interface in file
    await fileName.click()
    const interfaceName = navigationPanel.getByText('Bay', { exact: true })
    await expect(interfaceName).toBeVisible()

    // expand to show properties + relationship in file
    await interfaceName.click()
    await expect(navigationPanel.getByText('bayEnergyMeasFlag', { exact: true })).toBeVisible()
    await expect(navigationPanel.getByText('memberOfSubstation', { exact: true })).toBeVisible()

    // unexpand
    await fileName.click()
    await expect(interfaceName).toBeHidden()

    // file in nested directory
    await navigationPanel.getByText('root', { exact: true }).click()
    await navigationPanel.getByText('nested', { exact: true }).click()
    await expect(navigationPanel.getByText('IdentifiedObject.json', { exact: true })).toBeVisible()
  })

  test('interface selected', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto('./')

    await waitForUpdateLayout(page, () => page.locator('#mermaid-output').getByText('Bay', { exact: true }).click())
  })
})
