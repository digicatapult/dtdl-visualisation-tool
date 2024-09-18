import fs from 'fs'
import path from 'path'
//import * as parser from '../../interop/bin/Release/net8.0/browser-wasm/AppBundle/modelParser.js'

const { log } = console

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

// const parse = async (filepath) => {
//   const file = fs.readFileSync(filepath, "utf-8");
//   try {
//     const model = await parser.parse([file]);
//     console.log(`Parsed model with keys:`);
//     console.log(Object.keys(model));
//     const clean = removeUnderscoreKeys(model);
//     console.log(JSON.stringify(clean));
//   } catch (err) {
//     console.log(`Error parsing model '${filepath}'`);
//     console.log(err.errors);
//   }
// };

export const parseDirectory = async (directory: string): Promise<string | null> => {
  if (!fs.existsSync(directory)) {
    log(`'${directory}' not a valid filepath`)
    return null
  }

  log(`Looking for files in '${directory}'`)
  const filepaths = searchForJsonFiles(directory)

  log(`Found ${filepaths.length} files:`)
  log(filepaths)

  // filepaths.map(async (filepath) => await parse(filepath))
  return null
}
