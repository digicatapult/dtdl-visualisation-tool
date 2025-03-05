import { expect, test } from '@playwright/test'
import { waitForSuccessResponse, waitForUpdateLayout } from './helpers/waitForHelpers'

test.describe('Open Ontology from recently visited', () => {
  test('open ontology that can be edited', async ({ page, baseURL }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await waitForUpdateLayout(page, () => page.goto(baseURL!))
    await expect(page.locator('#toolbar').getByText('Open Ontology')).toBeVisible()

    await waitForSuccessResponse(page, () => page.locator('#open-button').click(), '/open')
    await expect(page.locator('#main-view').getByText('Viewed Today at ')).toBeVisible()
    await waitForSuccessResponse(page, () => page.locator('.file-card').first().click(), '/view')
    await expect(page.locator('#mermaid-output').getByText('ConnectivityNode', { exact: true })).toBeVisible()

    expect(await page.locator('#edit-toggle .switch').isEnabled()).toBeFalsy()

    expect(await page.locator('#edit-toggle').getAttribute('title')).toBe(
      'Only Ontologies from github that you have write permissions on, can be edited'
    )
  })
  test('open ontology than can be edited and check edit function works', async ({ page }) => {
    // login to github
    await page.setViewportSize({ width: 1920, height: 1080 })
    await waitForUpdateLayout(page, () => page.goto('./'))
    await expect(page.locator('#main-view').getByText('Upload New File')).toBeVisible()

    await waitForSuccessResponse(page, () => page.locator('.file-card').first().click(), '/view')
    await expect(page.locator('#mermaid-output').getByText('dtmi:com:example;1')).toBeVisible()

    // check the color of the border
    await waitForSuccessResponse(page, () => page.locator('#edit-toggle .switch').first().click(), '/edit-model')
    await expect(page.locator('#edit-toggle').getByText('Edit')).toBeVisible()
    const beforeContent = await page.evaluate(() => {
      const element = document.querySelector('#mermaid-wrapper')
      const style = element ? window.getComputedStyle(element, '::before') : null
      return style ? style.border : null
    })

    expect(beforeContent).toBe('5px solid rgb(0, 183, 155)')

    await waitForSuccessResponse(page, () => page.locator('#edit-toggle .switch').first().click(), '/edit-model')
    await expect(page.locator('#edit-toggle').getByText('View')).toBeVisible()

    await waitForSuccessResponse(
      page,
      () => page.locator('#mermaid-output').getByText('dtmi:com:example;1').first().click(),
      '/update-layout'
    )
    await waitForSuccessResponse(page, () => page.locator('#edit-toggle .switch').first().click(), '/edit-model')
    await expect(page.locator('#edit-toggle').getByText('Edit')).toBeVisible()

    const navigationAfterContent = await page.evaluate(() => {
      const element = document.querySelector('#navigation-panel h3:first-of-type')
      const style = element ? window.getComputedStyle(element, '::after') : null
      return style ? style.content : null
    })
    expect(navigationAfterContent).toBe('url("http://localhost:3000/public/images/pencil.svg")')

    await waitForSuccessResponse(page, () => page.locator('#edit-toggle .switch').first().click(), '/edit-model')
    await expect(page.locator('#edit-toggle').getByText('View')).toBeVisible()

    const navigationAfterContentNull = await page.evaluate(() => {
      const element = document.querySelector('#navigation-panel h3:first-of-type')
      const style = element ? window.getComputedStyle(element, '::after') : null
      return style ? style.content : null
    })
    expect(navigationAfterContentNull).toBe('none')
  })
})
