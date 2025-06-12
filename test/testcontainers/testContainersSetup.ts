import { GenericContainer, Network, StartedTestContainer, Wait } from 'testcontainers'
import { logger } from '../../src/lib/server/logger.js'

interface VisualisationUIConfig {
  containerName: string
  hostPort: number
  containerPort: number
  cookieSessionKeys: string
  maxOntologySize?: number
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

let visualisationUIContainer: StartedTestContainer
let postgresContainer: StartedTestContainer
let visualisationImage: GenericContainer

export async function bringUpDatabaseContainer(): Promise<StartedTestContainer> {
  const postgresConfig: databaseConfig = {
    containerName: 'postgres-dtdl-visualisation-tool',
    hostPort: 5432,
    containerPort: 5432,
    db: 'dtdl-visualisation-tool',
    dbUsername: 'postgres',
    dbPassword: 'postgres',
  }
  postgresContainer = await startDatabaseContainer(postgresConfig)
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

//build
export async function buildVisualisationImage(): Promise<GenericContainer> {
  logger.info(`Building container...`)
  visualisationImage = await GenericContainer.fromDockerfile('./').withCache(true).build()
  logger.info(`Built container.`)
  return visualisationImage
}

//start with environment variables
export async function startVisualisationContainer(env: VisualisationUIConfig): Promise<StartedTestContainer> {
  const { containerName, containerPort, hostPort, cookieSessionKeys, maxOntologySize } = env

  logger.info(`Starting container ${containerName} on port ${containerPort}...`)
  visualisationUIContainer = await visualisationImage
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
      GH_CLIENT_ID: process.env.GH_CLIENT_ID || '',
      GH_CLIENT_SECRET: process.env.GH_CLIENT_SECRET || '',
      COOKIE_SESSION_KEYS: cookieSessionKeys,
      EDIT_ONTOLOGY: 'true',
      MAX_DTDL_OBJECT_SIZE: maxOntologySize ? maxOntologySize.toString() : '1000',
    })
    .withAddedCapabilities('SYS_ADMIN')
    .withCommand(['sh', '-c', 'npx knex migrate:latest --env production; dtdl-visualiser parse -p /sample/energygrid'])
    .start()
  logger.info(`Started container ${containerName}`)
  logger.info(`Started container on port ${visualisationUIContainer.getMappedPort(containerPort)}`)
  return visualisationUIContainer
}

export async function stopAllContainers() {
  if (visualisationUIContainer) {
    await visualisationUIContainer.stop()
  }
  if (postgresContainer) {
    await postgresContainer.stop()
  }
}
