import { GenericContainer, getContainerRuntimeClient, StartedNetwork, StartedTestContainer, Wait } from 'testcontainers'
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

const containerRuntimeClient = await getContainerRuntimeClient()
const networkName = 'dtdl-visualisation-tool-network'
export const network = await startNetwork()

async function startNetwork() {
  const network = containerRuntimeClient.network.getById(networkName)
  // check if network is running
  try {
    await network.inspect()
  } catch {
    await containerRuntimeClient.network.create({ Name: networkName })
  }

  return new StartedNetwork(containerRuntimeClient, networkName, network)
}

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
  const postgresContainer = await new GenericContainer('postgres:17.5-alpine')
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
  const visualisationImage = await GenericContainer.fromDockerfile('./').withCache(true).build()
  logger.info(`Built container.`)
  return visualisationImage
}

//start with environment variables
export async function startVisualisationContainer(
  env: VisualisationUIConfig,
  visualisationImage: GenericContainer
): Promise<StartedTestContainer> {
  const { containerName, containerPort, hostPort, cookieSessionKeys, maxOntologySize } = env

  logger.info(`Starting container ${containerName} on port ${containerPort}...`)
  const visualisationUIContainer = await visualisationImage
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
      GH_APP_NAME: process.env.GH_APP_NAME || '',
      GH_APP_PRIVATE_KEY: process.env.GH_APP_PRIVATE_KEY || '',
      COOKIE_SESSION_KEYS: cookieSessionKeys,
      EDIT_ONTOLOGY: 'true',
      MAX_DTDL_OBJECT_SIZE: maxOntologySize ? maxOntologySize.toString() : '1000',
      // PostHog configuration for E2E tests
      // When POSTHOG_MOCK_PORT is set (via globalSetup), the container is configured
      // to send analytics events to our mock PostHog server at host.docker.internal
      // instead of the real PostHog service. This allows E2E tests to verify that
      // analytics events are being tracked correctly without sending data externally.
      POSTHOG_ENABLED: process.env.POSTHOG_MOCK_PORT ? 'true' : process.env.POSTHOG_ENABLED || 'false',
      NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY || 'phc_test_key',
      NEXT_PUBLIC_POSTHOG_HOST: process.env.POSTHOG_MOCK_PORT
        ? `http://host.docker.internal:${process.env.POSTHOG_MOCK_PORT}`
        : process.env.NEXT_PUBLIC_POSTHOG_HOST || '',
    })
    .withAddedCapabilities('SYS_ADMIN')
    .withCommand(['sh', '-c', 'npx knex migrate:latest --env production; dtdl-visualiser parse -p /sample/energygrid'])
    .start()
  logger.info(`Started container ${containerName}`)
  logger.info(`Started container on port ${visualisationUIContainer.getMappedPort(containerPort)}`)
  return visualisationUIContainer
}
