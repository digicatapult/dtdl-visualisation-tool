import { GenericContainer, StartedTestContainer } from 'testcontainers'

interface VisualisationUIConfig {
  containerName: string
  hostPort: number
  containerPort: number
}

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
  const containerBase = await GenericContainer.fromDockerfile('./').withCache(true).build()

  const visualisationUIContainer = await containerBase
    .withName(containerName)
    .withExposedPorts({
      container: containerPort,
      host: hostPort,
    })
    .start()
  return visualisationUIContainer
}
