#!/usr/bin/env node --no-warnings

import 'reflect-metadata'

import chalk from 'chalk'
import { Command } from 'commander'
import { container } from 'tsyringe'
import { parseDirectories, validateDirectories, getInterop } from '@digicatapult/dtdl-parser'
import { httpServer } from './lib/server/index.js'
import { DtdlLoader } from './lib/server/utils/dtdl/dtdlLoader.js'
import version from './version.js'

const { log } = console

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
    const parser = await getInterop()
    const parsedDtdl = parseDirectories(options.path, parser)

    if (parsedDtdl) {
      container.register(DtdlLoader, { useValue: new DtdlLoader(parsedDtdl) })
      httpServer(options.port)
    } else {
      process.exit(1)
    }
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
  log(`
    ${r('Invalid command: %s\nSee --help for a list of available commands.')}
    ${program.args.join(' ')}`)
  process.exit(127)
})
