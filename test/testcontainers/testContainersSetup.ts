import * as fs from 'node:fs'
import { GenericContainer, Network, StartedTestContainer, Wait } from 'testcontainers'
import { parse } from 'yaml'
import { logger } from '../../src/lib/server/logger.js'

//============ Start Network ====================

const network = await new Network().start()

//============ Image Version Control ============

const dockerCompose = fs.readFileSync('./docker-compose.yml', 'utf-8')
const parsed = parse(dockerCompose)
const postgresVersion = parsed.services['postgres-dtdl-visualisation-tool'].image

//============ Postgres Container ================

export async function bringUpDatabaseContainer(): Promise<StartedTestContainer> {
  const postgresContainer = await new GenericContainer(postgresVersion)
    .withName('postgres-dtdl-visualisation-tool')
    .withExposedPorts({
      container: 5432,
      host: 5432,
    })
    .withEnvironment({
      POSTGRES_PASSWORD: 'postgres',
      POSTGRES_USER: 'postgres',
      POSTGRES_DB: 'dtdl-visualisation-tool',
    })
    .withNetwork(network)
    .withWaitStrategy(Wait.forLogMessage('database system is ready to accept connections'))
    .start()
  return postgresContainer
}

//============ Visualiser UI ====================

export async function bringUpVisualisationContainer(): Promise<StartedTestContainer> {
  logger.info(`Building 'dtdl-visualiser' container...`)
  const containerBase = await GenericContainer.fromDockerfile('./').build()
  logger.info(`Built container.`)

  const visualisationUIContainer = await containerBase
    .withName('dtdl-visualiser')
    .withNetwork(network)
    .withExposedPorts({
      container: 3000,
      host: 3000,
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
      COOKIE_SESSION_KEYS: 'secret',
      EDIT_ONTOLOGY: 'true',
    })
    .withAddedCapabilities('SYS_ADMIN')
    .withCommand(['sh', '-c', 'npx knex migrate:latest --env production'])
    .start()
  logger.info(`Started container 'dtdl-visualiser' on port 3000`)
  return visualisationUIContainer
}
