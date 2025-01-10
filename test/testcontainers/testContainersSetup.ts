import { GenericContainer, Network, StartedNetwork, StartedTestContainer, Wait } from 'testcontainers'
import { logger } from '../../src/lib/server/logger.js'

interface VisualisationUIConfig {
  containerName: string
  hostPort: number
  containerPort: number
}

let network: StartedNetwork | null = null

export async function bringUpVisualisationContainer(): Promise<StartedTestContainer> {
  if (!network) {
    network = await new Network().start()
  }

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
    .withName(containerName)
    .withExposedPorts({
      container: containerPort,
      host: hostPort,
    })
    .withWaitStrategy(Wait.forListeningPorts())
    .withNetwork(network!) // Connect to the custom network
    .withReuse()
    .start()
  logger.info(`Started container ${containerName}`)

  logger.info(
    `Container ${visualisationUIContainer.getHost()} is running on http://localhost:${visualisationUIContainer.getMappedPort(containerPort)}`
  )
  return visualisationUIContainer
}
