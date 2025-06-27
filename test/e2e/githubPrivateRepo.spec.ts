import { expect, test as setup } from '@playwright/test'
import { tmpdir } from 'os'
import { join } from 'path'
import { attemptGHLogin } from './helpers/githubHelpers'
import { waitForSuccessResponse } from './helpers/waitForHelpers'

const ghAppName = process.env.GH_APP_NAME

setup('authorise all private repos via GitHub App install', async ({ browser }) => {
  const user1: boolean = setup.info().project.name == 'setup'
  const ghUser = user1 ? process.env.GH_TEST_USER : process.env.GH_TEST_USER_2
  const ghPassword = user1 ? process.env.GH_TEST_PASSWORD : process.env.GH_TEST_PASSWORD_2
  const gh2FA = user1 ? process.env.GH_TEST_2FA_SECRET : process.env.GH_TEST_2FA_SECRET_2
  if (!ghUser || !ghPassword || !gh2FA) {
    throw new Error('Test GitHub user credentials required')
  }

  const storageState = user1
    ? join(tmpdir() + '/playwright/.auth/user1.json')
    : join(tmpdir() + '/playwright/.auth/user2.json')

  const context = await browser.newContext({ storageState: undefined })
  const page = await context.newPage()
  await page.setViewportSize({ width: 1920, height: 1080 })
  await page.goto('./open')
  await expect(page.locator('#main-view').getByTitle('Upload New Ontology')).toBeVisible()

  await waitForSuccessResponse(
    page,
    () => page.locator('#main-view').getByTitle('Upload New Ontology').click(),
    '/menu'
  )
  await expect(page.locator('#main-view').getByText('GitHub')).toBeVisible()

  await waitForSuccessResponse(page, () => page.locator('#main-view').getByText('GitHub').click(), 'github.com/login')

  await page.waitForSelector('#login')

  // Fill in the credentials and sign in
  await attemptGHLogin(page, ghUser, ghPassword, gh2FA)

  await page.context().storageState({ path: storageState as string })

  const link = page.locator('.authorise-link')
  await expect(link).toBeVisible()

  // go to newly opened tab
  const [githubAppPage] = await Promise.all([context.waitForEvent('page'), link.click()])
  await githubAppPage.waitForLoadState()
  await expect(githubAppPage).toHaveURL(`https://github.com/apps/${ghAppName}`)

  const install = githubAppPage.locator('text="Install"')
  // install app if not already installed
  if ((await install.count()) > 0) {
    await install.click()
    await githubAppPage.locator('a[href*="target_type=User"]').click()
    await githubAppPage.locator('button:has-text("Install")').click()

    // reload original tab
    await page.reload()
    await waitForSuccessResponse(
      page,
      () => page.locator('#main-view').getByTitle('Upload New Ontology').click(),
      '/menu'
    )
    await waitForSuccessResponse(page, () => page.locator('#main-view').getByText('GitHub').click(), '/github/picker')
  }
  await expect(page.locator('.github-list').getByText('private_with_')).toBeVisible()
})
