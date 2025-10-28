import { postgresContainer, visualisationUIContainer, visualisationUIContainer2 } from './globalSetup'
import { network } from './testcontainers/testContainersSetup'

async function globalTeardown() {
  await visualisationUIContainer.stop()
  await visualisationUIContainer2.stop()
  await postgresContainer.stop()

  await network.stop()
}
export default globalTeardown
