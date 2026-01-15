import { Server } from 'node:http'
import 'reflect-metadata'
import { StartedTestContainer } from 'testcontainers'
import { POSTHOG_MOCK_PORT } from './constants.js'
import { copyGithubZipToWiremock } from './e2e/helpers/createGithubZip.js'
import { startMockPostHogServer } from './mocks/posthogMock.js'
import { files as dtdlTestFixtures } from './mocks/repos/dtdlTestFixtures.js'

import zipballMapping from './mocks/wiremock/mappings/zipball.json' with { type: 'json' }
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

export let visualisationUIGithub: StartedTestContainer
export let visualisationUIWiremock: StartedTestContainer
export let visualisationUIOversize: StartedTestContainer
export let visualisationUIIubenda: StartedTestContainer
export let postgresContainer: StartedTestContainer
export let wiremockContainer: StartedTestContainer
export let posthogMockServer: Server | null = null

export const visualisationUIGithubPort = 3000
export const visualisationUIWiremockPort = 3001
export const visualisationUIOversizePort = 3002
export const visualisationUIIubendaPort = 3003

async function globalSetup() {
  // Start PostHog mock server before containers
  posthogMockServer = await startMockPostHogServer(POSTHOG_MOCK_PORT)

  postgresContainer = await bringUpDatabaseContainer()

  wiremockContainer = await startWireMockContainer()
  await copyGithubZipToWiremock(wiremockContainer, dtdlTestFixtures, zipballMapping.response.bodyFileName)

  const visualisationImage = await buildVisualisationImage()
  visualisationUIGithub = await startVisualisationContainer(
    {
      containerName: 'dtdl-visualiser-github',
      hostPort: visualisationUIGithubPort,
    },
    visualisationImage
  )
  visualisationUIWiremock = await startVisualisationContainer(
    {
      containerName: 'dtdl-visualiser-wiremock',
      hostPort: visualisationUIWiremockPort,
      posthogMockPort: POSTHOG_MOCK_PORT,
      ghApiBaseUrl: 'http://wiremock:8080',
      ghOauthBaseUrl: 'http://localhost:8080',
      ghOauthTokenBaseUrl: 'http://wiremock:8080',
    },
    visualisationImage
  )
  visualisationUIOversize = await startVisualisationContainer(
    {
      containerName: 'dtdl-visualiser-oversize-model',
      hostPort: visualisationUIOversizePort,
      maxOntologySize: 25,
    },
    visualisationImage
  )
  visualisationUIIubenda = await startVisualisationContainer(
    {
      containerName: 'dtdl-visualiser-iubenda',
      hostPort: visualisationUIIubendaPort,
      iubendaEnabled: true,
    },
    visualisationImage
  )

  await waitForContainerHealth(`http://localhost:${visualisationUIGithubPort}`)
  await waitForContainerHealth(`http://localhost:${visualisationUIOversizePort}`)
  await waitForContainerHealth(`http://localhost:${visualisationUIIubendaPort}`)
  await waitForContainerHealth(`http://localhost:${visualisationUIWiremockPort}`)
}

export default globalSetup
