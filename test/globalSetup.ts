import 'reflect-metadata'
import { bringUpVisualisationContainer } from './testcontainers/testContainersSetup.js'

async function globalSetup() {
  await bringUpVisualisationContainer()
}

export default globalSetup
