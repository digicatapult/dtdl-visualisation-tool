import { getInterop, parseDtdl } from '@digicatapult/dtdl-parser'
import { readdir, readFile } from 'node:fs/promises'
import { join, relative } from 'node:path'
import { singleton } from 'tsyringe'
import unzipper from 'unzipper'
import { DtdlFile } from '../../../db/types.js'
import { DataError, UploadError } from '../../errors.js'

@singleton()
export default class Parser {
  async getJsonFiles(directory: string): Promise<DtdlFile[]> {
    const files: DtdlFile[] = []

    const traverse = async (dir: string) => {
      const entries = await readdir(dir, { withFileTypes: true })

      for (const entry of entries) {
        const fullPath = join(dir, entry.name)

        if (entry.isDirectory()) {
          await traverse(fullPath)
        } else if (entry.isFile() && entry.name.endsWith('.json')) {
          const contents = await readFile(fullPath, 'utf-8')
          try {
            const noBomJson = contents.replace(/^\uFEFF/, '')
            JSON.parse(noBomJson) // Validate JSON
            files.push({ path: relative(directory, fullPath), contents: noBomJson })
          } catch {
            // Ignore invalid JSON files
          }
        }
      }
    }

    await traverse(directory)
    return files
  }

  async unzipJsonFiles(buffer: Buffer, subdir?: string): Promise<DtdlFile[]> {
    const files: DtdlFile[] = []
    const directory = await unzipper.Open.buffer(buffer)

    const topDir = directory.files[0]
    if (!topDir || topDir.type !== 'Directory') throw new UploadError('Zip missing top-level directory')
    const topDirPath = topDir.path

    for (const file of directory.files) {
      if (subdir && !file.path.startsWith(join(topDirPath, subdir))) continue

      if (file.type === 'File' && file.path.endsWith('.json')) {
        const fileBuffer = await file.buffer()
        const contents = fileBuffer.toString().replace(/^\uFEFF/, '') // Remove BOM

        try {
          JSON.parse(contents) // Validate JSON
          files.push({ path: relative(topDirPath, file.path), contents })
        } catch {
          // Ignore invalid JSON files
        }
      }
    }

    return files
  }

  async parse(files: DtdlFile[]) {
    const allContents = `[${files.map((file) => file.contents).join(',')}]`

    const parser = await getInterop()
    const parsedDtdl = parseDtdl(allContents, parser)

    if (!parsedDtdl) {
      throw new DataError('Failed to parse DTDL model')
    }
    return parsedDtdl
  }
}
