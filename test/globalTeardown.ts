import {
  postgresContainer,
  posthogMockServer,
  visualisationUIContainer,
  visualisationUIContainer2,
} from './globalSetup'
import { network } from './testcontainers/testContainersSetup'

async function globalTeardown() {
  if (visualisationUIContainer) await visualisationUIContainer.stop()
  if (visualisationUIContainer2) await visualisationUIContainer2.stop()
  if (postgresContainer) await postgresContainer.stop()
  if (posthogMockServer) posthogMockServer.close()

  await network.stop()
}
export default globalTeardown
