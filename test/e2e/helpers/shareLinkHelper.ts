import { BrowserContext, expect, Page } from '@playwright/test'

export const getShareableLink = async (
  page: Page,
  context: BrowserContext,
  projectName: string,
  entireOntology: boolean = true
): Promise<string> => {
  if (projectName.includes('chromium')) {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  }
  await expect(page.locator('#toolbar').getByText('Share Ontology')).toBeVisible()
  page.locator('#toolbar').getByText('Share Ontology').click()
  await expect(page.locator('#toolbar').getByText('Shareable Link')).toBeVisible()
  // click on first radio
  page
    .locator('#share-link-modal')
    .getByText(entireOntology ? 'Entire ontology' : 'Current search')
    .click()
  // assert the link is as expected
  await expect
    .poll(async () => {
      return await page.locator('#link-output').inputValue()
    })
    .toBe(entireOntology ? page.url().split('?')[0] : page.url())
  // click copy
  page.locator('#copy-link-button').click()
  await expect(page.locator('#share-link-modal').getByText('Copied!')).toBeVisible()
  let clipboardText: string
  if (projectName.includes('webkit')) {
    clipboardText = await page.locator('#link-output').inputValue()
  } else {
    clipboardText = await page.evaluate(() => navigator.clipboard.readText())
  }
  return clipboardText
}
