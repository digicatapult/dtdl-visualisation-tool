#!/usr/bin/env node --no-warnings

import 'reflect-metadata'

import chalk from 'chalk'
import { Command } from 'commander'
import { parseDirectory } from './lib/parser.js'
import { httpServer } from './lib/server/index.js'
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
  .command('validate')
  .description('Validate a dtdl ontology')
  .option('-P, --port <port>', 'specify host port number if it is not a default, default - 3000', '3000')
  .requiredOption('-p --path <path/to/dir>', 'Path to dtdl ontology directory')
  .action(async (options) => {
    log(`Parsing DTDL at: ${options.path}`)

    const parsedDtdl = await parseDirectory(options.path)

    if (parsedDtdl) {
      httpServer(options)
    }
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
