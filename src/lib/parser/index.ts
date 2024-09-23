import fs from 'fs'
import path from 'path'
import { DtdlObjectModel, InterfaceInfo } from '../../../interop/DtdlOm.js'
import { errorHandler, isResolutionException } from './error.js'
import { Parser } from './interop.js'

const { log, error } = console

export const searchForJsonFiles = (directory: string): string[] => {
  if (!fs.existsSync(directory)) {
    error(`'${directory}' not a valid filepath`)
    return []
  }

  return fs
    .readdirSync(directory)
    .map((file) => path.join(directory, file))
    .reduce((jsonFiles, fullPath) => {
      if (fs.statSync(fullPath).isDirectory()) {
        return jsonFiles.concat(searchForJsonFiles(fullPath)) //recursive
      } else if (path.extname(fullPath) === '.json') {
        return jsonFiles.concat(fullPath)
      }
      return jsonFiles
    }, [] as string[])
}

const readJsonFile = (filepath: string): unknown | null => {
  try {
    const file = fs.readFileSync(filepath, 'utf-8')
    const json = JSON.parse(file)
    return json
  } catch (err) {
    error(`Invalid JSON at '${filepath}'`)
    error(err)
    return null
  }
}

export const combineJson = (filepaths: string[]) => {
  return filepaths.reduce((combinedJson, filepath) => {
    const json = readJsonFile(filepath)
    if (json) combinedJson.push(json)
    return combinedJson
  }, [] as unknown[])
}

export const validate = (filepath: string, parserModule: Parser, incResolutionException: boolean): boolean => {
  try {
    const file = fs.readFileSync(filepath, 'utf-8')
    parserModule.parse(file)
    log(`Successfully validated '${filepath}'`)
    return true
  } catch (err) {
    if (!incResolutionException && isResolutionException(err)) {
      // ignore resolution exception
      log(`Successfully validated '${filepath}'`)
      return true
    }
    error(`Error parsing '${filepath}'`)
    errorHandler(err)
    return false
  }
}

export const readAndParseJson = (json: unknown[], parserModule: Parser): DtdlObjectModel | null => {
  try {
    const model = JSON.parse(parserModule.parse(JSON.stringify(json))) as DtdlObjectModel
    log(`Successfully parsed`)
    return model
  } catch (err) {
    error(`Error parsing`)
    errorHandler(err)
    return null
  }
}

export const validateDirectories = (directory: string, parser: Parser, incResolutionException: boolean): boolean => {
  log(`${parser.parserVersion()}\n`)
  log(`Validating DTDL at: '${directory}'`)

  const filepaths = searchForJsonFiles(directory)
  if (filepaths.length < 1) return false

  log(`Found ${filepaths.length} files:`)
  log(filepaths)

  for (const filepath of filepaths) {
    const isValid = validate(filepath, parser, incResolutionException)
    if (!isValid) return false // stop validating if error
  }

  log(`All files validated!\n`)
  return true
}

export const parseDirectories = (directory: string, parser: Parser): DtdlObjectModel | null => {
  log(`${parser.parserVersion()}\n`)
  log(`Parsing DTDL at: '${directory}'`)

  const filepaths = searchForJsonFiles(directory)
  if (filepaths.length < 1) return null

  log(`Found ${filepaths.length} files:`)
  log(filepaths)

  const fullJson = combineJson(filepaths)
  const fullModel = readAndParseJson(fullJson, parser)
  if (fullModel === null) return null

  log(`All files parsed!\n`)
  log(`Entities:`)
  log(Object.keys(fullModel))

  // Example type guard
  const interfaces: InterfaceInfo[] = Object.values(fullModel).filter(
    (value): value is InterfaceInfo => value.EntityKind === 'Interface'
  )
  log(`Number of interfaces: ${interfaces.length}`)

  return fullModel
}
