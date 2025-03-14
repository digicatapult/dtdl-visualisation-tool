import { getInterop, parseDtdl } from '@digicatapult/dtdl-parser'
import unzipper from 'unzipper'

import { readdir, readFile } from 'node:fs/promises'
import { join, relative } from 'node:path'
import { DataError, UploadError } from '../../errors.js'

export interface File {
  path: string
  contents: string
}

export const getJsonFiles = async (directory: string): Promise<File[]> => {
  const files: File[] = []

  async function traverse(dir: string) {
    const entries = await readdir(dir, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = join(dir, entry.name)

      if (entry.isDirectory()) {
        await traverse(fullPath)
      } else if (entry.isFile() && entry.name.endsWith('.json')) {
        const contents = await readFile(fullPath, 'utf-8')
        try {
          const noBomJson = contents.replace(/^\uFEFF/, '')
          JSON.parse(contents)
          files.push({ path: relative(directory, fullPath), contents: noBomJson })
        } catch {
          // ignore invalid json files
        }
      }
    }
  }

  await traverse(directory)

  return files
}

export const unzipJsonFiles = async (buffer: Buffer, subdir?: string): Promise<File[]> => {
  const files: File[] = []

  const directory = await unzipper.Open.buffer(buffer)

  // defensive - github repo zips always seem to add a top level dir
  const topDir = directory.files[0]
  if (!topDir || topDir.type !== 'Directory') throw new UploadError('Zip missing top level dir')
  const topDirPath = topDir.path

  for (const file of directory.files) {
    if (subdir && !file.path.startsWith(join(topDirPath, subdir))) {
      // ignore files not in subdirectory
      continue
    }

    if (file.type === 'File' && file.path.endsWith('.json')) {
      const fileBuffer = await file.buffer()
      const contents = fileBuffer.toString()
      const noBomJson = contents.replace(/^\uFEFF/, '') // Remove BOM

      try {
        JSON.parse(noBomJson) // Validate JSON
        files.push({ path: relative(topDirPath, file.path), contents: noBomJson })
      } catch {
        // Ignore invalid JSON files
      }
    }
  }

  return files
}

export const parse = async (files: File[]) => {
  const allContents = `[${files.map((file) => file.contents).join(',')}]`

  const parser = await getInterop()
  const parsedDtdl = parseDtdl(allContents, parser)

  if (!parsedDtdl) {
    throw new DataError('Failed to parse DTDL model')
  }
  return parsedDtdl
}
