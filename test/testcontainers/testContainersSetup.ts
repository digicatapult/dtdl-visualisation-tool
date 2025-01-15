import { DockerComposeEnvironment, StartedDockerComposeEnvironment } from 'testcontainers'
import { logger } from '../../src/lib/server/logger.js'
import path from 'path'
import { Environment } from 'testcontainers/build/container-runtime/clients/container/types.js'

// interface VisualisationUIConfig {
//   containerName: string
//   hostPort: number
//   containerPort: number
// }

export async function bringUpVisualisationContainer(): Promise<StartedDockerComposeEnvironment> {
  // const visualisationUIConfig: VisualisationUIConfig = {
  //   containerName: 'dtdl-visualiser',
  //   hostPort: 3000,
  //   containerPort: 3000,
  // }
  const visualisationUIContainer = await startVisualisationContainer()
  return visualisationUIContainer
}

export async function startVisualisationContainer() {
  // const { containerName, containerPort, hostPort } = env
  logger.info(`Building container...`)
  const composeFilePath = path.resolve('.');
  const composeFile = 'docker-compose.yml'
  // const containerBase = await GenericContainer.fromDockerfile('./').withCache(true).build()
  const environment = await new DockerComposeEnvironment(composeFilePath, composeFile).up([`${process.env.CI ? 'dtdl-visualiser-ci' : 'dtdl-visualiser'}`])
  logger.info(`Built container.`)

  // logger.info(`Starting container ${containerName} on port ${containerPort}...`)
  // const redisContainer = environment.getContainer('dtdl-visualiser')
  // redisContainer
  // // const visualisationUIContainer = await containerBase
  // //   .withNetwork(network)
  // //   .withExposedPorts({
  // //     container: containerPort,
  // //     host: hostPort,
  // //   })
  // //   .withAddedCapabilities('SYS_ADMIN')
  // //   .start()
  // logger.info(`Started container ${containerName}`)
  // logger.info(`Started container on port ${visualisationUIContainer.getMappedPort(containerPort)}`)
  return environment
}
