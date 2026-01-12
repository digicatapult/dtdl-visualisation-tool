import {
  postgresContainer,
  posthogMockServer,
  visualisationUIGithub,
  visualisationUIIubenda,
  visualisationUIOversize,
  visualisationUIWiremock,
  wiremockContainer,
} from './globalSetup'
import { stopMockPostHogServer } from './mocks/posthogMock.js'
import { network } from './testcontainers/testContainersSetup'

async function globalTeardown() {
  if (visualisationUIWiremock) await visualisationUIWiremock.stop()
  if (visualisationUIOversize) await visualisationUIOversize.stop()
  if (visualisationUIIubenda) await visualisationUIIubenda.stop()
  if (visualisationUIGithub) await visualisationUIGithub.stop()
  if (postgresContainer) await postgresContainer.stop()
  if (wiremockContainer) await wiremockContainer.stop()
  if (posthogMockServer) await stopMockPostHogServer()

  await network.stop()
}
export default globalTeardown
