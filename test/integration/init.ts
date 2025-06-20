import 'reflect-metadata'
import { StartedTestContainer } from 'testcontainers'
import { bringUpDatabaseContainer, bringUpVisualisationContainer } from '../testcontainers/testContainersSetup.js'

let dbContainer: StartedTestContainer
let visualisationContainer: StartedTestContainer

before(async function () {
  this.timeout(420000)
  dbContainer = await bringUpDatabaseContainer()
  visualisationContainer = await bringUpVisualisationContainer()
})

after(async function () {
  await dbContainer.stop()
  await visualisationContainer.stop()
})
