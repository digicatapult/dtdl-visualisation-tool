import { z } from 'zod'
import { ModelDb } from '../../../db/modelDb.js'
import { DataError } from '../../errors.js'
import { DtdlId, UUID } from '../../models/strings.js'

export type UpdateType = keyof typeof updateMap

// Validates and returns an updated DTDL file
export const parseUpdate = async (
  dtdlModelId: UUID,
  dtdlRowId: UUID,
  definedIn: DtdlId,
  modelDb: ModelDb,
  updateType: UpdateType,
  contents: unknown,
  newValue: string
) => {
  try {
    JSON.parse(`{"key":"${newValue}"}`)
  } catch {
    throw new DataError(`Invalid JSON: '${newValue}'`)
  }

  // DTDL files can be array or single object
  const updatedContents = Array.isArray(contents)
    ? contents.map((c) => (c['@id'] === definedIn ? updateMap[updateType](c, newValue) : c))
    : updateMap[updateType](contents, newValue)

  await modelDb.parseWithUpdatedFile(dtdlModelId, dtdlRowId, JSON.stringify(updatedContents))

  return updatedContents
}

const updateDisplayName = (contents: unknown, newValue: string) => {
  const schema = z.object({
    '@type': z.literal('Interface'),
    displayName: z.string(),
  })

  const validContents: z.infer<typeof schema> = schema.passthrough().parse(contents)
  validContents.displayName = newValue
  return validContents
}

const updateDescription = (contents: unknown, newValue: string) => {
  const schema = z.object({
    '@type': z.literal('Interface'),
    description: z.string(),
  })

  const validContents: z.infer<typeof schema> = schema.passthrough().parse(contents)
  validContents.description = newValue
  return validContents
}

const updateEntityComment = (contents: unknown, newValue: string) => {
  const schema = z.object({
    '@type': z.literal('Interface'),
    comment: z.string(),
  })

  const validContents: z.infer<typeof schema> = schema.passthrough().parse(contents)
  validContents.comment = newValue
  return validContents
}

const updateMap = {
  displayName: updateDisplayName,
  description: updateDescription,
  entityComment: updateEntityComment,
} as const
