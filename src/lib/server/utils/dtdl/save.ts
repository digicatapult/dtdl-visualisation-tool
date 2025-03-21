import { z } from 'zod'
import { ModelDb } from '../../../db/modelDb'
import { DataError } from '../../errors'
import { UUID } from '../../models/strings'

export type UpdateType = keyof typeof updateMap

export const parseContents = async (
  dtdlModelId: UUID,
  dtdlRowId: UUID,
  modelDb: ModelDb,
  updateType: UpdateType,
  contents: unknown,
  newValue: string
) => {
  try {
    JSON.parse(`{"key":"${newValue}"}`)
  } catch {
    throw new DataError(`Invalid JSON: ${JSON.stringify(newValue)}`)
  }
  // handle if contents is an array

  const validContents = updateMap[updateType](contents, newValue)

  await modelDb.parseWithUpdatedFile(dtdlModelId, dtdlRowId, JSON.stringify(validContents))

  return validContents
}

const updateDisplayName = (contents: unknown, newValue: string) => {
  const schema = z.object({
    '@id': z.literal('Interface'),
    displayName: z.string(),
  })

  const validContents: z.infer<typeof schema> = schema.passthrough().parse(contents)
  validContents.displayName = newValue
  return validContents
}

const updateDescription = (contents: unknown, newValue: string) => {
  const schema = z.object({
    '@id': z.literal('Interface'),
    description: z.string(),
  })

  const validContents: z.infer<typeof schema> = schema.passthrough().parse(contents)
  validContents.description = newValue
  return validContents
}

const updateEntityComment = (contents: unknown, newValue: string) => {
  const schema = z.object({
    '@id': z.literal('Interface'),
    comment: z.string(),
  })

  const validContents: z.infer<typeof schema> = schema.passthrough().parse(contents)
  validContents.comment = newValue
  return validContents
}

const updatePropertyName = (contents: unknown, newValue: string) => {
  const contentSchema = z.object({
    '@type': z.literal('Property'),
    name: z.string(),
  })
  const schema = z.object({
    '@id': z.literal('Interface'),
    contents: z.array(z.unknown()).refine((contents) =>
      contents.some((content) => {
        try {
          contentSchema.parse(content)
          return true
        } catch {
          return false
        }
      })
    ),
  })

  //need original name to find and replace
}

const updateMap = {
  displayName: updateDisplayName,
  description: updateDescription,
  entityComment: updateEntityComment,
  propertyName: updatePropertyName,
} as const
