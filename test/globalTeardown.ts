import 'reflect-metadata'
import { stopAllContainers } from './testcontainers/testContainersSetup.js'

async function globalTeardown() {
  await stopAllContainers()
}

export default globalTeardown
