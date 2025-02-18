import { getInterop, parseDirectories } from '@digicatapult/dtdl-parser'
import { rm } from 'node:fs/promises'

import Database from '../../../db'
import { DataError } from '../../errors.js'
import { type UUID } from '../../models/strings.js'
import { SvgGenerator } from '../mermaid/generator'

import { container } from 'tsyringe'
import { Cache, ICache } from '../cache.js'

export const parseAndInsertDtdl = async (
  localPath: string,
  dtdlName: string,
  db: Database,
  generator: SvgGenerator,
  deleteLocal: boolean = false
): Promise<UUID> => {
  const parser = await getInterop()
  const parsedDtdl = parseDirectories(localPath, parser)

  if (deleteLocal) await rm(localPath, { recursive: true })

  if (!parsedDtdl) {
    throw new DataError('Failed to parse DTDL model')
  }

  const output = await generator.run(parsedDtdl, 'flowchart', 'elk')

  const [{ id }] = await db.insert('model', {
    name: dtdlName,
    parsed: parsedDtdl,
    preview: output.renderForMinimap(),
  })

  const cache = container.resolve<ICache>(Cache)
  const cacheKey = new URLSearchParams()
  cacheKey.set('dtdlId', id)

  cache.set(cacheKey.toString(), output.renderToString())

  return id
}
