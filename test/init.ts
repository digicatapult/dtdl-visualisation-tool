import 'reflect-metadata'

import { StartedTestContainer } from 'testcontainers'
import { bringUpDatabaseContainer, bringUpVisualisationContainer } from './testcontainers/testContainersSetup.js'

let databaseContainer: StartedTestContainer
let visualisationContainer: StartedTestContainer

before(async function () {
  this.timeout(420000)
  databaseContainer = await bringUpDatabaseContainer()
  visualisationContainer = await bringUpVisualisationContainer()
})

after(async function () {
  this.timeout(420000)
  if (visualisationContainer) {
    await visualisationContainer.stop()
  }
  if (databaseContainer) {
    await databaseContainer.stop()
  }
})
