import { z } from 'zod'
import { DataError } from '../../errors.js'
import { DtdlSchema } from '../../models/strings.js'

const invalidChars = /["\\]/
export const MAX_VALUE_LENGTH = 512 // DTDL spec
export const MAX_DISPLAY_NAME_LENGTH = 64 // lower than DTDL spec limit (512) to avoid visual issues of long display names

export const updateDisplayName = (value: string) => (file: unknown) => {
  return updateInterfaceValue(file, value, `displayName`, MAX_DISPLAY_NAME_LENGTH)
}

export const updateDescription = (value: string) => (file: unknown) => {
  return updateInterfaceValue(file, value, `description`, MAX_VALUE_LENGTH)
}

export const updateComment = (value: string) => (file: unknown) => {
  return updateInterfaceValue(file, value, `comment`, MAX_VALUE_LENGTH)
}

export const updateRelationshipDisplayName = (value: string, relationshipName: string) => (file: unknown) => {
  return updateContentsValue(file, value, 'Relationship', relationshipName, 'displayName', MAX_DISPLAY_NAME_LENGTH)
}

export const updateRelationshipDescription = (value: string, relationshipName: string) => (file: unknown) => {
  return updateContentsValue(file, value, 'Relationship', relationshipName, 'description', MAX_VALUE_LENGTH)
}

export const updateRelationshipComment = (value: string, relationshipName: string) => (file: unknown) => {
  return updateContentsValue(file, value, 'Relationship', relationshipName, 'comment', MAX_VALUE_LENGTH)
}

export const updatePropertyName = (newValue: string, originalValue: string) => (file: unknown) => {
  if (invalidChars.test(newValue)) throw new DataError(`Invalid JSON: '${newValue}'`)
  if (newValue.length > 64) throw new DataError(`Property name has max length of 64 characters`)

  const schema = z.object({
    '@type': z.literal('Interface'),
    contents: z
      .array(
        z.looseObject({
          '@type': z.string(),
          name: z.string(),
        })
      )
      .refine((contents) => contents.some((c) => c['@type'] === 'Property' && c.name === originalValue)),
  })

  const validFile: z.infer<typeof schema> = schema.passthrough().parse(file)

  const updatedContents = validFile.contents.map((item) => {
    if (item.name === newValue) {
      throw new DataError(`Property/Relationship/Telemetry with name "${newValue}" already exists`)
    }

    if (item['@type'] === 'Property' && item.name === originalValue) {
      return { ...item, name: newValue }
    }

    return item
  })

  return { ...validFile, contents: updatedContents }
}

export const updatePropertyComment = (value: string, propertyName: string) => (file: unknown) => {
  return updateContentsValue(file, value, 'Property', propertyName, 'comment', MAX_VALUE_LENGTH)
}

export const updateTelemetryComment = (value: string, telemetryName: string) => (file: unknown) => {
  return updateContentsValue(file, value, 'Telemetry', telemetryName, 'comment', MAX_VALUE_LENGTH)
}

export const updateTelemetryDescription = (value: string, telemetryName: string) => (file: unknown) => {
  return updateContentsValue(file, value, 'Telemetry', telemetryName, 'description', MAX_VALUE_LENGTH)
}

export const updateTelemetryDisplayName = (value: string, telemetryName: string) => (file: unknown) => {
  return updateContentsValue(file, value, 'Telemetry', telemetryName, 'displayName', MAX_DISPLAY_NAME_LENGTH)
}

export const updateTelemetrySchema = (value: DtdlSchema, telemetryName: string) => (file: unknown) => {
  return updateContentsValue(file, value, 'Telemetry', telemetryName, 'schema', MAX_VALUE_LENGTH)
}

const updateInterfaceValue = (
  file: unknown,
  value: string,
  keyToUpdate: 'displayName' | 'description' | 'comment',
  maxLength: number
) => {
  if (invalidChars.test(value)) throw new DataError(`Invalid JSON: '${value}'`)

  if (value.length > maxLength) throw new DataError(`${keyToUpdate} has max length of ${maxLength} characters`)

  const schema = z.object({
    '@type': z.literal('Interface'),
    [keyToUpdate]: z.string(),
  })

  const validFile: z.infer<typeof schema> = schema.passthrough().parse(file)

  return { ...validFile, [keyToUpdate]: value }
}

const updateContentsValue = (
  file: unknown,
  value: string,
  contentType: 'Relationship' | 'Property' | 'Telemetry',
  contentName: string, // effectively contentId - has to be unique in DTDL
  keyToUpdate: 'displayName' | 'description' | 'comment' | 'schema',
  maxLength: number
) => {
  if (invalidChars.test(value)) throw new DataError(`Invalid JSON: '${value}'`)

  if (value.length > maxLength)
    throw new DataError(`${contentType} '${keyToUpdate}' has max length of ${maxLength} characters`)

  const schema = z.object({
    '@type': z.literal('Interface'),
    contents: z
      .array(
        z.looseObject({
          '@type': z.string(),
          name: z.string(),
          [keyToUpdate]: z.string().optional(),
        })
      )
      .refine((contents) => contents.some((c) => c['@type'] === contentType && c.name === contentName)),
  })

  const validFile: z.infer<typeof schema> = schema.passthrough().parse(file)

  const index = validFile.contents.findIndex((item) => item['@type'] === contentType && item.name === contentName)
  const updatedContents = validFile.contents.toSpliced(index, 1, {
    ...validFile.contents[index],
    [keyToUpdate]: value,
  })

  return { ...validFile, contents: updatedContents }
}
