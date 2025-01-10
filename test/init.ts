import { use } from 'chai'
import 'reflect-metadata'

import chaiJestSnapshot from 'chai-jest-snapshot'
import { StartedTestContainer } from 'testcontainers'
import { bringUpVisualisationContainer } from './testcontainers/testContainersSetup.js'

let visualisationContainer: StartedTestContainer

before(async function () {
  this.timeout(300000)
  visualisationContainer = await bringUpVisualisationContainer()

  use(chaiJestSnapshot)
  chaiJestSnapshot.resetSnapshotRegistry()
})

after(async function () {
  this.timeout(300000)
  if (visualisationContainer) {
    await visualisationContainer.stop()
  }
})

beforeEach(function () {
  chaiJestSnapshot.configureUsingMochaContext(this)
})
