import { Command } from 'commander'
import cliVersion from './version.js'

const { log } = console

const program = new Command();


program
    .name('dtdl-visualiser')
    .description('A CLI tool for visualising digital twin ontologies')
    .version(cliVersion, '-v, --version', 'ouput current version')
    .helpOption('--help', 'display help for command')

program
    .command('validate')
    .description('Validate a dtdl ontology')
    .requiredOption('-p --path <path/to/dir>', 'Path to dtdl ontolody directory')
    .action(async (options) => {
        log(`path: ${options.path}`)
    })

program.parse()
const options = program.opts()
log(`The following options were given${options}`)