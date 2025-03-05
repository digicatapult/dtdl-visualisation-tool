import { expect, Page, test } from '@playwright/test'
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
  test('open ontology than can be edited and check edit function works', async ({ page, baseURL }) => {
    // login to github
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto('./open')
    await expect(page.locator('#main-view').getByText('Upload New File')).toBeVisible()

    await waitForSuccessResponse(page, () => page.locator('#main-view').getByText('Upload New File').click(), '/menu')
    await expect(page.locator('#main-view').getByText('GitHub')).toBeVisible()

    await waitForSuccessResponse(page, () => page.locator('#main-view').getByText('GitHub').click(), '/github/picker')

    await expect(page.locator('.github-list li').first()).toBeVisible()
    await waitForSuccessResponse(page, () => page.locator('.github-list li').first().click(), '/branches')

    // click main branch, 1st option is back button
    await expect(page.locator('.github-list li').nth(1)).toBeVisible()
    await waitForSuccessResponse(page, () => page.locator('.github-list li').nth(1).click(), '/contents')

    // get dtdl from github
    await waitForSuccessResponse(page, () => page.click('#select-folder'), '/ontology')
    await expect(page.locator('#mermaid-output').getByText('dtmi:com:example;1')).toBeVisible()

    // check the color of the border
    await waitForSuccessResponse(page, () => page.locator('#edit-toggle .switch').first().click(), '/edit-model')
    await expect(page.locator('#edit-toggle').getByText('Edit')).toBeVisible()
    const beforeContent = await getStyledComponent(page, '#mermaid-wrapper', '::before')

    expect(beforeContent?.border).toBe('5px solid rgb(0, 183, 155)')

    await waitForSuccessResponse(page, () => page.locator('#edit-toggle .switch').first().click(), '/edit-model')
    await expect(page.locator('#edit-toggle').getByText('View')).toBeVisible()

    await waitForSuccessResponse(
      page,
      () => page.locator('#mermaid-output').getByText('dtmi:com:example;1').first().click(),
      '/update-layout'
    )
    await waitForSuccessResponse(page, () => page.locator('#edit-toggle .switch').first().click(), '/edit-model')
    await expect(page.locator('#edit-toggle').getByText('Edit')).toBeVisible()

    const navigationAfterContent = await getStyledComponent(page, '#navigation-panel h3:first-of-type', '::after')
    expect(navigationAfterContent?.content).toBe(`url("${baseURL}/public/images/pencil.svg")`)

    await waitForSuccessResponse(page, () => page.locator('#edit-toggle .switch').first().click(), '/edit-model')
    await expect(page.locator('#edit-toggle').getByText('View')).toBeVisible()

    const navigationAfterContentNull = await getStyledComponent(page, '#navigation-panel h3:first-of-type', '::after')
    expect(navigationAfterContentNull?.content).toBe('none')
  })
})

const getStyledComponent = async (page: Page, selector: string, pseudoElement: string) => {
  return page.evaluate(
    ({ selector, pseudoElement }) => {
      const element = document.querySelector(selector)
      return element ? window.getComputedStyle(element, pseudoElement) : null
    },
    { selector, pseudoElement }
  )
}
