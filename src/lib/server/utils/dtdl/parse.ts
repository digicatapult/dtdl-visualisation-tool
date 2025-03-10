import { getInterop, parseDirectories } from '@digicatapult/dtdl-parser'

import Database from '../../../db'
import { PartialInsertDtdl } from '../../../db/types'
import { dtdlCacheKey } from '../../controllers/helpers.js'
import { DataError } from '../../errors.js'
import { GenerateParams } from '../../models/controllerTypes'
import { type UUID } from '../../models/strings.js'
import { ICache } from '../cache.js'
import { SvgGenerator } from '../mermaid/generator'

export const parseAndInsertDtdl = async (
  localPath: string,
  dtdlName: string,
  db: Database,
  generator: SvgGenerator,
  cache: ICache,
  files?: PartialInsertDtdl[]
): Promise<UUID> => {
  const parser = await getInterop()
  const parsedDtdl = parseDirectories(localPath, parser)

  if (!parsedDtdl) {
    throw new DataError('Failed to parse DTDL model')
  }

  const output = await generator.run(parsedDtdl, 'flowchart', 'elk')

  const [{ id }] = await db.insert('model', {
    name: dtdlName,
    parsed: parsedDtdl,
    preview: output.renderForMinimap(),
  })

  if (files)
    await db.insertMany(
      'dtdl',
      files.map((file) => ({ ...file, model_id: id }))
    )

  const defaultParams: GenerateParams = { layout: 'elk', diagramType: 'flowchart', expandedIds: [], search: '' }
  cache.set(dtdlCacheKey(id, defaultParams), output)

  return id
}
