import 'reflect-metadata'

import { StartedDockerComposeEnvironment } from 'testcontainers'
import { bringUpVisualisationContainer } from './testcontainers/testContainersSetup.js'

let visualisationContainer: StartedDockerComposeEnvironment

before(async function () {
  this.timeout(420000)
  visualisationContainer = await bringUpVisualisationContainer()
})

after(async function () {
  this.timeout(420000)
  if (visualisationContainer) {
    await visualisationContainer.down()
  }
})
