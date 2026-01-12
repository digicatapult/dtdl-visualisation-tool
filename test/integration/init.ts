import 'reflect-metadata'

import { type StartedTestContainer } from 'testcontainers'
import {
  bringUpDatabaseContainer,
  buildVisualisationImage,
  startVisualisationContainer,
} from '../testcontainers/testContainersSetup.js'

export let visualisationUIContainer: StartedTestContainer
export let postgresContainer: StartedTestContainer

before(async function () {
  this.timeout(420000)

  postgresContainer = await bringUpDatabaseContainer()
  const visualisationImage = await buildVisualisationImage()
  visualisationUIContainer = await startVisualisationContainer(
    {
      containerName: 'dtdl-visualiser',
      hostPort: 3000,
      containerPort: 3000,
      cookieSessionKeys: 'secret',
    },
    visualisationImage
  )
})

after(async function () {
  this.timeout(420000)
  await Promise.all([visualisationUIContainer.stop(), postgresContainer.stop()])
})
