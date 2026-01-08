import {
  postgresContainer,
  posthogMockServer,
  visualisationUIContainer,
  visualisationUIContainer2,
  visualisationUIContainer3,
  wiremockContainer,
} from './globalSetup'
import { stopMockPostHogServer } from './mocks/posthogMock.js'
import { network } from './testcontainers/testContainersSetup'

async function globalTeardown() {
  if (visualisationUIContainer) await visualisationUIContainer.stop()
  if (visualisationUIContainer2) await visualisationUIContainer2.stop()
  if (visualisationUIContainer3) await visualisationUIContainer3.stop()
  if (postgresContainer) await postgresContainer.stop()
  if (posthogMockServer) await stopMockPostHogServer()
  if (wiremockContainer) await wiremockContainer.stop()

  await network.stop()
}
export default globalTeardown
