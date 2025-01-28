import { mkdtemp, rm } from 'node:fs/promises'
import os from 'node:os'

import { getInterop, parseDirectories } from '@digicatapult/dtdl-parser'
import { join } from 'node:path'
import { Post, Produces, Route, SuccessResponse, UploadedFile } from 'tsoa'
import { injectable } from 'tsyringe'
import unzipper from 'unzipper'
import Database from '../../db/index.js'
import { DataError, UploadError } from '../errors.js'

import { HTMLController } from './HTMLController.js'

@injectable()
@Route('/upload')
@Produces('text/html')
export class UploadController extends HTMLController {
  constructor(private db: Database) {
    super()
  }

  @SuccessResponse(302, 'File uploaded successfully')
  @Post('/')
  public async uploadZip(@UploadedFile('file') file: Express.Multer.File): Promise<void> {
    if (file.mimetype !== 'application/zip') {
      throw new UploadError('File must be a .zip')
    }

    let unzippedPath: string
    try {
      unzippedPath = await this.unzip(file.buffer)
    } catch {
      throw new UploadError('Uploaded zip file is not valid')
    }

    const parser = await getInterop()
    const parsedDtdl = parseDirectories(unzippedPath, parser)

    rm(unzippedPath, { recursive: true })

    if (!parsedDtdl) {
      throw new DataError('Failed to parse DTDL model')
    }

    const [{ id }] = await this.db.insert('model', { name: file.originalname, parsed: parsedDtdl })

    this.setHeader('HX-Redirect', `/ontology/${id}/view`)
    return
  }

  public async unzip(file: Buffer): Promise<string> {
    const directory = await unzipper.Open.buffer(file)

    const tempDir = os.tmpdir()
    const extractionPath = await mkdtemp(join(tempDir, 'dtdl-'))
    await directory.extract({ path: extractionPath })

    return extractionPath
  }
}
