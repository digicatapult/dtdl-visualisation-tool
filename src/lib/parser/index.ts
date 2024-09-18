import fs from 'fs'
import path from 'path'
import { DtdlObjectModel } from '../../../interop/DtdlOm.js'
import { parse, parserVersion } from '../../../interop/modelParser.js'
import { handleParsingException } from './error.js'

const { log, error } = console

const searchForJsonFiles = (directory: string): string[] => {
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

const readAndParse = async (filepath: string): Promise<DtdlObjectModel | null> => {
  try {
    const file = fs.readFileSync(filepath, 'utf-8')
    const model = JSON.parse(await parse(file)) as DtdlObjectModel
    log(`Successfully parsed '${filepath}'`)
    return model
  } catch (err: any) {
    error(`Error parsing '${filepath}'`)
    handleParsingException(err.toString())
    return null
  }
}

export const parseDirectories = async (directory: string): Promise<DtdlObjectModel[] | null> => {
  log(`Parsing DTDL at: ${directory}`)

  if (!fs.existsSync(directory)) {
    error(`'${directory}' not a valid filepath`)
    return null
  }
  log(`${parserVersion()}\n`)

  log(`Looking for files in '${directory}'`)
  const filepaths = searchForJsonFiles(directory)

  log(`Found ${filepaths.length} files:`)
  log(filepaths)

  let models: DtdlObjectModel[] = []
  for (const filepath of filepaths) {
    const model = await readAndParse(filepath)
    if (model === null) return null // stop parsing if error
    models.push(model)
  }

  log(`All files parsed!\n`)
  log(`Entities:`)
  models.map((entity) => log(Object.keys(entity)))

  return models
}
