import 'reflect-metadata'
import {
  bringUpDatabaseContainer,
  buildVisualisationImage,
  startVisualisationContainer,
} from './testcontainers/testContainersSetup.js'

async function globalSetup() {
  await bringUpDatabaseContainer()
  await buildVisualisationImage()
  // Start the visualisation container on port 3000
  await startVisualisationContainer({
    containerName: 'dtdl-visualiser',
    hostPort: 3000,
    containerPort: 3000,
    cookieSessionKeys: 'secret',
  })
  // Start the visualisation container on port 3001
  await startVisualisationContainer({
    containerName: 'dtdl-visualiser-custom',
    hostPort: 3001,
    containerPort: 3000,
    cookieSessionKeys: 'test',
    maxOntologySize: 10,
  })
}

export default globalSetup
