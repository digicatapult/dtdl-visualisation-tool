import 'reflect-metadata'
import { bringUpDatabaseContainer, bringUpVisualisationContainer } from './testcontainers/testContainersSetup.js'

async function globalSetup() {
  await bringUpDatabaseContainer()
  await bringUpVisualisationContainer()
}

export default globalSetup
