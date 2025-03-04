#!/usr/bin/env node

import 'reflect-metadata'

import { getInterop, validateDirectories } from '@digicatapult/dtdl-parser'
import chalk from 'chalk'
import { Command } from 'commander'
import { randomUUID } from 'node:crypto'
import { container } from 'tsyringe'
import Database from './lib/db/index.js'
import { httpServer } from './lib/server/index.js'
import { logger } from './lib/server/logger.js'
import { Cache, ICache } from './lib/server/utils/cache.js'
import { DtdlLoader } from './lib/server/utils/dtdl/dtdlLoader.js'
import { parseAndInsertDtdl } from './lib/server/utils/dtdl/parse.js'
import { SvgGenerator } from './lib/server/utils/mermaid/generator.js'
import version from './version.js'

const program = new Command()

const { red: r } = {
  red: (txt: string) => chalk.redBright(txt),
}

program
  .name('dtdl-visualiser')
  .description('A CLI tool for visualising digital twin ontologies')
  .version(version, '-v, --version', 'output current version')
  .helpOption('--help', 'display help for command')

program
  .command('parse')
  .description('parse a dtdl ontology and start a server')
  .option('-P, --port <port>', 'specify host port number if it is not a default, default - 3000', '3000')
  .requiredOption('-p --path <path/to/dir>', 'Path to dtdl ontology directory')
  .action(async (options) => {
    const db = container.resolve(Database)
    const generator = container.resolve(SvgGenerator)
    const cache = container.resolve<ICache>(Cache)
    logger.info(`Storing default model in db`)

    const id = await parseAndInsertDtdl(options.path, `default`, db, generator, false, cache, randomUUID())

    const dtdlLoader = new DtdlLoader(db, id)
    container.register(DtdlLoader, {
      useValue: dtdlLoader,
    })

    logger.info(`Complete`)

    httpServer(options.port)
  })

program
  .command('validate')
  .description('validate a dtdl ontology')
  .requiredOption('-p --path <path/to/dir>', 'Path to dtdl ontology directory')
  .option('-r', 'include Resolution exceptions in validation', false)
  .action(async (options) => {
    const parser = await getInterop()
    const allValid = validateDirectories(options.path, parser, options.r)
    process.exit(allValid ? 0 : 1)
  })

program.parse()
if (!program.option) {
  program.help()
}

program.on('command:*', function () {
  logger.error(`
    ${r('Invalid command: %s\nSee --help for a list of available commands.')}
    ${program.args.join(' ')}`)
  process.exit(127)
})
