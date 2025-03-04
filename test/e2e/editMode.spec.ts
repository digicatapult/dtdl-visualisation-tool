import { expect, Page, test } from '@playwright/test'
import { TOTP } from 'otpauth'
import { waitForSuccessResponse, waitForUpdateLayout } from './helpers/waitForHelpers'

const ghTestUser = process.env.GH_TEST_USER
const ghTestPassword = process.env.GH_TEST_PASSWORD
const gh2faSecret = process.env.GH_TEST_2FA_SECRET

if (!ghTestUser || !ghTestPassword || !gh2faSecret) throw new Error('Test GitHub user credentials required')

const totp = new TOTP({
  issuer: 'GitHub',
  label: 'test',
  algorithm: 'SHA1',
  digits: 6,
  period: 30,
  secret: gh2faSecret,
})

test.describe('Open Ontology from recently visited', () => {
  test('open ontology that can be edited', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 })
    await waitForUpdateLayout(page, () => page.goto('./'))
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
    await expect(page.locator('#toolbar').getByText('Open Ontology')).toBeVisible()

    await waitForSuccessResponse(page, () => page.locator('#open-button').click(), '/open')
    await expect(page.locator('#main-view').getByText('Upload New File')).toBeVisible()

    await waitForSuccessResponse(page, () => page.locator('#main-view').getByText('Upload New File').click(), '/menu')
    await expect(page.locator('#main-view').getByText('GitHub')).toBeVisible()

    await waitForSuccessResponse(page, () => page.locator('#main-view').getByText('GitHub').click(), 'github.com/login')
    await expect(page.locator('#login')).toBeVisible()

    // Sign in with Test GitHub user
    await page.fill('#login_field', ghTestUser)
    await page.fill('#password', ghTestPassword)

    await waitForSuccessResponse(page, () => page.click('input[name="commit"]'), 'github.com/sessions/two-factor/app')
    await expect(page.locator('#app_totp')).toBeVisible()

    await attempt2fa(page)

    await page.waitForTimeout(5000)

    // Sometimes GitHub requests to reauthorise the app
    if (!page.url().includes('/open')) {
      if (await page.getByText('too many codes').isVisible())
        throw new Error('GitHub login of test user requested too many times. Try again in a few minutes')

      await waitForSuccessResponse(page, () => page.locator('button:has-text("authorize")').click(), '/repos')
    }
    // click first of test users repos
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

const attempt2fa = async (page: Page) => {
  await page.fill('#app_totp', totp.generate())
  await page.waitForTimeout(2000)

  // Check if 2fa code already used
  if (await page.locator('.js-flash-alert').isVisible()) {
    const remaining = totp.period - (Math.floor(Date.now() / 1000) % totp.period)
    await page.waitForTimeout(remaining * 1000)
    return attempt2fa(page)
  } else {
    return
  }
}
