import { GenericContainer, Network, StartedTestContainer } from 'testcontainers'
import { logger } from '../../src/lib/server/logger.js'

interface VisualisationUIConfig {
  containerName: string
  hostPort: number
  containerPort: number
}

const network = await new Network().start()

export async function bringUpVisualisationContainer(): Promise<StartedTestContainer> {
  const visualisationUIConfig: VisualisationUIConfig = {
    containerName: 'dtdl-visualiser',
    hostPort: 3000,
    containerPort: 3000,
  }
  const visualisationUIContainer = await startVisualisationContainer(visualisationUIConfig)
  return visualisationUIContainer
}

export async function startVisualisationContainer(env: VisualisationUIConfig) {
  const { containerName, containerPort, hostPort } = env
  logger.info(`Building container...`)
  const containerBase = await GenericContainer.fromDockerfile('./').withCache(true).build()
  logger.info(`Built container.`)

  logger.info(`Starting container ${containerName} on port ${containerPort}...`)
  const visualisationUIContainer = await containerBase
    .withNetwork(network)
    .withExposedPorts({
      container: containerPort,
      host: hostPort,
    }).withAddedCapabilities('SYS_PTRACE')
    .start()
  logger.info(`Started container ${containerName}`)
  logger.info(`Started container on port ${visualisationUIContainer.getMappedPort(containerPort)}`)
  return visualisationUIContainer
}
