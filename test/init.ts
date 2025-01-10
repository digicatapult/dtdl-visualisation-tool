import 'reflect-metadata'

import { StartedTestContainer } from 'testcontainers'
import { bringUpVisualisationContainer } from './testcontainers/testContainersSetup.js'

let visualisationContainer: StartedTestContainer

before(async function () {
  this.timeout(300000)
  visualisationContainer = await bringUpVisualisationContainer()
})

after(async function () {
  this.timeout(300000)
  if (visualisationContainer) {
    await visualisationContainer.stop()
  }
})
