import 'reflect-metadata'

import { bringUpDatabaseContainer, bringUpVisualisationContainer } from '../testcontainers/testContainersSetup.js'

before(async function () {
  this.timeout(420000)
  await bringUpDatabaseContainer()
  await bringUpVisualisationContainer()
})
