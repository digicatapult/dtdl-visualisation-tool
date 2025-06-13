import 'reflect-metadata'

import {
  bringUpDatabaseContainer,
  buildVisualisationImage,
  startVisualisationContainer,
  stopAllContainers,
} from '../testcontainers/testContainersSetup.js'

before(async function () {
  this.timeout(420000)
  await bringUpDatabaseContainer()
  await buildVisualisationImage()
  await startVisualisationContainer({
    containerName: 'dtdl-visualiser',
    hostPort: 3000,
    containerPort: 3000,
    cookieSessionKeys: 'secret',
  })
})

after(async function () {
  this.timeout(420000)
  stopAllContainers()
})
