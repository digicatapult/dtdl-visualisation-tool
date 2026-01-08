import { chromium, FullConfig, Page } from '@playwright/test'
import { Server } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { TOTP } from 'otpauth'
import 'reflect-metadata'
import { GenericContainer, StartedTestContainer } from 'testcontainers'
import { POSTHOG_MOCK_PORT } from './constants.js'
import { createGithubZip } from './e2e/helpers/createGithubZip.js'
import { waitForSuccessResponse } from './e2e/helpers/waitForHelpers.js'
import { startMockPostHogServer } from './mocks/posthogMock.js'
import {
  bringUpDatabaseContainer,
  buildVisualisationImage,
  startVisualisationContainer,
  startWireMockContainer,
} from './testcontainers/testContainersSetup.js'

// Wait for container to be healthy by polling the health endpoint
async function waitForContainerHealth(baseURL: string, maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch(`${baseURL}/api/health`)
      if (response.ok) {
        return
      }
    } catch {
      // Ignore errors, keep retrying
    }
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }
  throw new Error(`Container at ${baseURL} failed to become healthy after ${maxAttempts} attempts`)
}

type UserCredentials = {
  ghTestUser: string
  ghTestPassword: string
  gh2faSecret: string
  storageStatePath: string
}

const user1: UserCredentials = {
  ghTestUser: process.env.GH_TEST_USER!,
  ghTestPassword: process.env.GH_TEST_PASSWORD!,
  gh2faSecret: process.env.GH_TEST_2FA_SECRET!,
  storageStatePath: join(tmpdir(), 'user1.json'),
}

const user2: UserCredentials = {
  ghTestUser: process.env.GH_TEST_USER_2!,
  ghTestPassword: process.env.GH_TEST_PASSWORD_2!,
  gh2faSecret: process.env.GH_TEST_2FA_SECRET_2!,
  storageStatePath: join(tmpdir(), 'user2.json'),
}

export let visualisationUIContainer: StartedTestContainer
export let visualisationUIContainer2: StartedTestContainer
export let visualisationUIContainer3: StartedTestContainer
export let postgresContainer: StartedTestContainer
export let wiremockContainer: StartedTestContainer
export let visualisationImage: GenericContainer
export let posthogMockServer: Server | null = null

async function globalSetup(config: FullConfig) {
  // Start PostHog mock server before containers
  posthogMockServer = await startMockPostHogServer(POSTHOG_MOCK_PORT)

  postgresContainer = await bringUpDatabaseContainer()

  // Start WireMock container for GitHub API mocking
  wiremockContainer = await startWireMockContainer()

  // Create GitHub zip file with sample DTDL and copy to WireMock container
  const dtdlFiles = [
    {
      path: 'base.json',
      content: JSON.stringify({
        '@context': ['dtmi:dtdl:context;4'],
        '@id': 'dtmi:com:base;1',
        '@type': 'Interface',
        contents: [
          {
            '@type': 'Property',
            name: 'baseProperty',
            schema: 'short',
          },
          {
            '@type': 'Relationship',
            name: 'baseRelationship',
          },
          {
            '@type': 'Telemetry',
            name: 'baseTelemetry',
            schema: 'double',
          },
        ],
      }),
    },
    {
      path: 'edit.json',
      content: JSON.stringify([
        {
          '@context': ['dtmi:dtdl:context;4'],
          '@id': 'dtmi:com:edit:contents;1',
          '@type': 'Interface',
          displayName: 'displayNameEdit',
          description: 'descriptionEdit',
          comment: 'commentEdit',
          extends: ['dtmi:com:base;1'],
          contents: [
            {
              '@type': 'Property',
              name: 'propertyName',
              displayName: 'propertyDisplayNameEdit',
              description: 'propertyDescriptionEdit',
              comment: 'propertyCommentEdit',
              schema: 'float',
              writable: false,
            },
            {
              '@type': 'Relationship',
              name: 'relationshipName',
              target: 'dtmi:com:example;1',
              comment: 'relationshipCommentEdit',
              displayName: 'relationshipDisplayNameEdit',
              description: 'relationshipDescriptionEdit',
            },
            {
              '@type': 'Telemetry',
              name: 'telemetryName',
              schema: 'float',
              comment: 'telemetryCommentEdit',
              description: 'telemetryDescriptionEdit',
              displayName: 'telemetryDisplayNameEdit',
            },
            {
              '@type': 'Command',
              name: 'turnOn',
              displayName: 'turnOnCommandDisplayNameEdit',
              comment: 'turnOnCommandCommentEdit',
              description: 'turnOnCommandDescriptionEdit',
              request: {
                name: 'mode',
                displayName: 'modeRequestDisplayName',
                description: 'modeRequestDescription',
                comment: 'modeRequestComment',
                schema: {
                  '@type': 'Enum',
                  valueSchema: 'string',
                  enumValues: [
                    { name: 'cool', enumValue: 'cool' },
                    { name: 'heat', enumValue: 'heat' },
                    { name: 'auto', enumValue: 'auto' },
                  ],
                },
              },
              response: {
                name: 'mode',
                description: 'modeResponseDescription',
                comment: 'modeResponseComment',
                schema: 'string',
              },
            },
            {
              '@type': 'Command',
              name: 'turnOff',
              displayName: 'turnOffCommandDisplayNameEdit',
              comment: 'turnOffCommandCommentEdit',
              description: 'turnOffCommandDescriptionEdit',
            },
          ],
        },
        {
          '@context': ['dtmi:dtdl:context;4'],
          '@id': 'dtmi:com:example;1',
          '@type': 'Interface',
        },
      ]),
    },
  ]

  const zipPath = join(tmpdir(), 'sample-repo.zip')
  const cleanup = await createGithubZip(dtdlFiles, zipPath, 'test-repo', 'abc123def456')
  await wiremockContainer.copyFilesToContainer([
    {
      source: zipPath,
      target: '/home/wiremock/__files/sample-repo.zip',
    },
  ])
  await cleanup()

  visualisationImage = await buildVisualisationImage()
  // Start the visualisation container on port 3000
  visualisationUIContainer = await startVisualisationContainer(
    {
      containerName: 'dtdl-visualiser',
      hostPort: 3000,
      containerPort: 3000,
      cookieSessionKeys: 'secret',
      posthogMockPort: POSTHOG_MOCK_PORT,
    },
    visualisationImage
  )
  // Start the visualisation container on port 3001
  visualisationUIContainer2 = await startVisualisationContainer(
    {
      containerName: 'dtdl-visualiser-custom',
      hostPort: 3001,
      containerPort: 3000,
      cookieSessionKeys: 'test',
      maxOntologySize: 25,
      posthogMockPort: POSTHOG_MOCK_PORT,
    },
    visualisationImage
  )

  // Wait for containers to be fully ready before running OAuth
  await waitForContainerHealth(config.projects[0].use.baseURL || 'http://localhost:3000')

  // Run GitHub OAuth flow before starting Iubenda container to avoid interference
  // await getGithubToken(config, user1)
  // await getGithubToken(config, user2)

  // Start the visualisation container on port 3002 with Iubenda enabled
  // Started after OAuth to prevent external Iubenda script from interfering
  visualisationUIContainer3 = await startVisualisationContainer(
    {
      containerName: 'dtdl-visualiser-iubenda',
      hostPort: 3002,
      containerPort: 3000,
      cookieSessionKeys: 'iubenda-test',
      posthogMockPort: POSTHOG_MOCK_PORT,
      iubendaEnabled: true,
    },
    visualisationImage
  )
}

const attempt2fa = async (totp: TOTP, page: Page) => {
  await page.fill('#app_totp', totp.generate())
  await page.waitForTimeout(2000)

  // Check if 2fa code already used
  if (await page.locator('.js-flash-alert').isVisible()) {
    const remaining = totp.period - (Math.floor(Date.now() / 1000) % totp.period)
    await page.waitForTimeout(remaining * 1000)
    return attempt2fa(totp, page)
  } else {
    return
  }
}

async function getGithubToken(config: FullConfig, credentials: UserCredentials) {
  const { ghTestUser, ghTestPassword, gh2faSecret, storageStatePath } = credentials
  if (!ghTestUser || !ghTestPassword || !gh2faSecret) {
    throw new Error('Test GitHub user credentials envs required')
  }

  const { baseURL } = config.projects[0].use

  const browser = await chromium.launch()
  const context = await browser.newContext()
  const page = await context.newPage()

  await page.setViewportSize({ width: 1920, height: 1080 })
  await page.goto(`${baseURL}/open`)

  await waitForSuccessResponse(
    page,
    () => page.locator('#main-view').getByTitle('Upload New Ontology').click(),
    '/menu'
  )
  await waitForSuccessResponse(page, () => page.locator('#main-view').getByText('GitHub').click(), 'github.com/login')

  // Wait for GitHub login form
  await page.waitForSelector('#login_field')

  // Fill in the credentials and sign in
  await page.fill('#login_field', ghTestUser)
  await page.fill('#password', ghTestPassword)
  await waitForSuccessResponse(page, () => page.click('input[name="commit"]'), 'github.com/sessions/two-factor/app')
  await page.waitForSelector('#app_totp')

  const totp = new TOTP({
    issuer: 'GitHub',
    label: 'test',
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: gh2faSecret,
  })
  await attempt2fa(totp, page)

  // wait for redirection
  await page.waitForTimeout(5000)

  // Sometimes GitHub requests reauthorisation
  if (!page.url().includes('/open')) {
    if (await page.getByText('too many codes').isVisible()) {
      throw new Error('GitHub login of test user requested too many times. Try again in a few minutes')
    }
    await waitForSuccessResponse(page, () => page.locator('button:has-text("authorize")').click(), '/repos')
  }

  // Store current state (cookies) for future tests
  await page.context().storageState({ path: storageStatePath })
  await context.close()
  await browser.close()
}
export default globalSetup
