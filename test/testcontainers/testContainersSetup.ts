import { GenericContainer, Network, StartedTestContainer, Wait } from 'testcontainers'
import { logger } from '../../src/lib/server/logger.js'

interface VisualisationUIConfig {
  containerName: string
  hostPort: number
  containerPort: number
}
interface databaseConfig {
  containerName: string
  hostPort: number
  containerPort: number
  db: string
  dbUsername: string
  dbPassword: string
}

const network = await new Network().start()

export async function bringUpDatabaseContainer(): Promise<StartedTestContainer> {
  const postgresConfig: databaseConfig = {
    containerName: 'postgres-dtdl-visualisation-tool',
    hostPort: 5432,
    containerPort: 5432,
    db: 'dtdl-visualisation-tool',
    dbUsername: 'postgres',
    dbPassword: 'postgres',
  }
  const postgresContainer = await startDatabaseContainer(postgresConfig)
  return postgresContainer
}

export async function startDatabaseContainer(env: databaseConfig): Promise<StartedTestContainer> {
  const postgresContainer = await new GenericContainer('postgres:17.2-alpine')
    .withName(env.containerName)
    .withExposedPorts({
      container: env.containerPort,
      host: env.hostPort,
    })
    .withEnvironment({
      POSTGRES_PASSWORD: env.dbPassword,
      POSTGRES_USER: env.dbUsername,
      POSTGRES_DB: env.db,
    })
    .withNetwork(network)
    .withWaitStrategy(Wait.forLogMessage('database system is ready to accept connections'))
    .withReuse()
    .start()
  return postgresContainer
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

export async function startVisualisationContainer(env: VisualisationUIConfig): Promise<StartedTestContainer> {
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
    })
    .withEnvironment({
      DB_HOST: 'postgres-dtdl-visualisation-tool',
      DB_NAME: 'dtdl-visualisation-tool',
      DB_USERNAME: 'postgres',
      DB_PASSWORD: 'postgres',
      DB_PORT: '5432',
    })
    .withAddedCapabilities('SYS_ADMIN')
    .withCommand(['sh', '-c', 'npx knex migrate:latest --env production; dtdl-visualiser parse -p /sample/energygrid'])
    .start()
  logger.info(`Started container ${containerName}`)
  logger.info(`Started container on port ${visualisationUIContainer.getMappedPort(containerPort)}`)
  return visualisationUIContainer
}
