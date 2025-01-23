import 'reflect-metadata'
import { bringUpVisualisationContainer, bringUpDatabaseContainer } from './testcontainers/testContainersSetup.js'

async function globalSetup() {
  await bringUpDatabaseContainer()
  await bringUpVisualisationContainer()
}

export default globalSetup
