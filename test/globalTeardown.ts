import 'reflect-metadata'
import { stopContainers } from './testcontainers/testContainersSetup.js'

async function globalTeardown() {
    await stopContainers()
}

export default globalTeardown