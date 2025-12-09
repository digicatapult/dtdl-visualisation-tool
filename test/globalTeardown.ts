import {
  postgresContainer,
  posthogMockServer,
  visualisationUIContainer,
  visualisationUIContainer2,
} from './globalSetup'
import { stopMockPostHogServer } from './mocks/posthogMock.js'
import { network } from './testcontainers/testContainersSetup'

async function globalTeardown() {
  if (visualisationUIContainer) await visualisationUIContainer.stop()
  if (visualisationUIContainer2) await visualisationUIContainer2.stop()
  if (postgresContainer) await postgresContainer.stop()
  if (posthogMockServer) await stopMockPostHogServer()

  await network.stop()
}
export default globalTeardown
