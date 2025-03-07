import { DtdlObjectModel, getInterop, parseDirectories } from '@digicatapult/dtdl-parser'
import { rm } from 'node:fs/promises'

import Database from '../../../db'
import { ModelDb } from '../../../db/modelDb.js'
import { dtdlCacheKey } from '../../controllers/helpers.js'
import { DataError } from '../../errors.js'
import { GenerateParams } from '../../models/controllerTypes'
import { FileSourceKeys } from '../../models/openTypes'
import { type UUID } from '../../models/strings.js'
import { ICache } from '../cache.js'
import { SvgGenerator } from '../mermaid/generator'

function compareDtdlObjectModel(obj1: DtdlObjectModel, obj2: DtdlObjectModel): boolean {
  return JSON.stringify(obj1, Object.keys(obj1).sort()) === JSON.stringify(obj2, Object.keys(obj2).sort())
}

export const parseAndInsertDtdl = async (
  localPath: string,
  dtdlName: string,
  db: Database,
  generator: SvgGenerator,
  deleteLocal: boolean = false,
  cache: ICache,
  source: FileSourceKeys,
  owner: string | null = null,
  repo: string | null = null
): Promise<UUID> => {
  const parser = await getInterop()
  const parsedDtdl = parseDirectories(localPath, parser)

  if (deleteLocal) await rm(localPath, { recursive: true })

  if (!parsedDtdl) {
    throw new DataError('Failed to parse DTDL model')
  }

  if (source === 'default') {
    const modelDb = new ModelDb(db)
    const model = await modelDb.getDefaultModel()
    if (model) {
      if (compareDtdlObjectModel(model.parsed as DtdlObjectModel, parsedDtdl)) return model.id
      await modelDb.deleteDefaultModel()
    }
  }

  const output = await generator.run(parsedDtdl, 'flowchart', 'elk')

  const [{ id }] = await db.insert('model', {
    name: dtdlName,
    parsed: parsedDtdl,
    preview: output.renderForMinimap(),
    source: source,
    owner: owner,
    repo: repo,
  })
  const defaultParams: GenerateParams = { layout: 'elk', diagramType: 'flowchart', expandedIds: [], search: '' }
  cache.set(dtdlCacheKey(id, defaultParams), output)

  return id
}
