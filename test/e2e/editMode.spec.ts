import { expect, Page, test } from '@playwright/test'
import { waitForSuccessResponse, waitForUpdateLayout } from './helpers/waitForHelpers'

test.describe('Test edit ontology', () => {
  test('open ontology that cant be edited and check that toggle is disabled', async ({ page, baseURL }) => {
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
  test('edit display name', async ({ page, baseURL }) => {
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

    // turn on edit mode
    await waitForSuccessResponse(page, () => page.locator('#edit-toggle .switch').first().click(), '/edit-model')
    await expect(page.locator('#edit-toggle').getByText('Edit')).toBeVisible()

    // assert editing styling
    const border = await getStyledComponent(page, '#mermaid-wrapper', '::before', 'border')
    expect(border).toBe('5px solid rgb(0, 183, 155)')

    await waitForSuccessResponse(
      page,
      () => page.locator('#mermaid-output').getByText('edit').first().click(),
      '/update-layout'
    )

    const navigationAfterContent = await getStyledComponent(
      page,
      '#navigation-panel h3:first-of-type',
      '::after',
      'content'
    )
    expect(navigationAfterContent).toBe(`url("${baseURL}/public/images/pencil.svg")`)

    // edit display name and focus away from textarea to trigger update
    const newDisplayName = 'new display name'
    const textarea = page.locator('.nav-panel-editable').getByText('edit')
    await textarea.fill(newDisplayName)
    await waitForSuccessResponse(page, () => page.mouse.click(0, 0), '/update')
    await expect(page.locator('#mermaid-output').getByText(newDisplayName)).toBeVisible()

    // search by new name
    await page.focus('#search')
    await waitForUpdateLayout(page, () => page.fill('#search', newDisplayName))
    await expect(page.locator('#mermaid-output').getByText(newDisplayName)).toBeVisible()

    // turn off edit mode
    await waitForSuccessResponse(page, () => page.locator('#edit-toggle .switch').first().click(), '/edit-model')
    await expect(page.locator('#edit-toggle').getByText('View')).toBeVisible()

    const navigationAfterContentNull = await getStyledComponent(
      page,
      '#navigation-panel h3:first-of-type',
      '::after',
      'content'
    )
    expect(navigationAfterContentNull).toBe('none')
  })
})

const getStyledComponent = async (page: Page, selector: string, pseudoElement: string, property: string) => {
  await page.waitForSelector(selector)
  return page.evaluate(
    ({ selector, pseudoElement, property }) => {
      const element = document.querySelector(selector)
      const style = element ? window.getComputedStyle(element, pseudoElement) : null
      return style ? style.getPropertyValue(property) : null
    },
    { selector, pseudoElement, property }
  )
}
