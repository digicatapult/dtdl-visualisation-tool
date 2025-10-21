import { z } from 'zod'
import { DataError } from '../../errors.js'

export const updateDisplayName = (value: string) => (file: unknown) => {
  return updateInterfaceValue(file, value, `displayName`, 64)
}

export const updateDescription = (value: string) => (file: unknown) => {
  return updateInterfaceValue(file, value, `description`, 512)
}

export const updateComment = (value: string) => (file: unknown) => {
  return updateInterfaceValue(file, value, `comment`, 512)
}

export const updateRelationshipDisplayName = (value: string, relationshipName: string) => (file: unknown) => {
  return updateContentsValue(file, value, 'Relationship', relationshipName, 'displayName', 64)
}

export const updateRelationshipDescription = (value: string, relationshipName: string) => (file: unknown) => {
  return updateContentsValue(file, value, 'Relationship', relationshipName, 'description', 512)
}

export const updateRelationshipComment = (value: string, relationshipName: string) => (file: unknown) => {
  return updateContentsValue(file, value, 'Relationship', relationshipName, 'comment', 512)
}

export const updatePropertyName = (newValue: string, originalValue: string) => (file: unknown) => {
  if (newValue.length > 64) throw new DataError(`Property name has max length of 64 characters`)

  const schema = z.object({
    '@type': z.literal('Interface'),
    contents: z
      .array(
        z
          .object({
            '@type': z.string(),
            name: z.string(),
          })
          .passthrough()
      )
      .refine((contents) => contents.some((c) => c['@type'] === 'Property' && c.name === originalValue)),
  })

  const validFile: z.infer<typeof schema> = schema.passthrough().parse(file)

  const updatedContents = validFile.contents.map((item) => {
    if (item.name === newValue) {
      throw new DataError(`Property/Relationship with name "${newValue}" already exists`)
    }

    if (item['@type'] === 'Property' && item.name === originalValue) {
      return { ...item, name: newValue }
    }

    return item
  })

  return { ...validFile, contents: updatedContents }
}

export const updatePropertyComment = (value: string, propertyName: string) => (file: unknown) => {
  return updateContentsValue(file, value, 'Property', propertyName, 'comment', 512)
}

export const updateTelemetryName = (newValue: string, originalValue: string) => (file: unknown) => {
  if (newValue.length > 64) throw new DataError(`Telemetry name has max length of 64 characters`)

  const schema = z.object({
    '@type': z.literal('Interface'),
    contents: z
      .array(
        z
          .object({
            '@type': z.string(),
            name: z.string(),
          })
          .passthrough()
      )
      .refine((contents) => contents.some((c) => c['@type'] === 'Telemetry' && c.name === originalValue)),
  })

  const validFile: z.infer<typeof schema> = schema.passthrough().parse(file)

  const updatedContents = validFile.contents.map((item) => {
    if (item.name === newValue) {
      throw new DataError(`Property/Relationship/Telemetry with name "${newValue}" already exists`)
    }

    if (item['@type'] === 'Telemetry' && item.name === originalValue) {
      return { ...item, name: newValue }
    }
    return item
  })

  return { ...validFile, contents: updatedContents }
}

export const updateTelemetryComment = (value: string, telemetryName: string) => (file: unknown) => {
  return updateContentsValue(file, value, 'Telemetry', telemetryName, 'comment', 512)
}

export const updateTelemetryDescription = (value: string, telemetryName: string) => (file: unknown) => {
  return updateContentsValue(file, value, 'Telemetry', telemetryName, 'description', 512)
}

export const updateTelemetryDisplayName = (value: string, telemetryName: string) => (file: unknown) => {
  return updateContentsValue(file, value, 'Telemetry', telemetryName, 'displayName', 512)
}

export const updateTelemetrySchema = (value: string, telemetryName: string) => (file: unknown) => {
  const validSchemas = [
    'boolean',
    'byte',
    'bytes',
    'date',
    'dateTime',
    'decimal',
    'double',
    'duration',
    'float',
    'integer',
    'long',
    'short',
    'string',
    'time',
    'unsignedByte',
    'unsignedInteger',
    'unsignedLong',
    'unsignedShort',
    'uuid',
  ]

  if (!validSchemas.includes(value)) {
    throw new DataError(`Invalid schema type. Must be one of: ${validSchemas.join(', ')}`)
  }

  return updateContentsValue(file, value, 'Telemetry', telemetryName, 'schema', 64)
}

const updateInterfaceValue = (
  file: unknown,
  value: string,
  keyToUpdate: 'displayName' | 'description' | 'comment',
  maxLength: number
) => {
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
  if (value.length > maxLength)
    throw new DataError(`${contentType} '${keyToUpdate}' has max length of ${maxLength} characters`)

  const schema = z.object({
    '@type': z.literal('Interface'),
    contents: z
      .array(
        z
          .object({
            '@type': z.string(),
            name: z.string(),
            [keyToUpdate]: z.string().optional(),
          })
          .passthrough()
      )
      .refine((contents) =>
        contents.some((c) => c['@type'] === contentType && c.name === contentName)
      ),
  })

  const validFile: z.infer<typeof schema> = schema.passthrough().parse(file)

  const index = validFile.contents.findIndex((item) => item['@type'] === contentType && item.name === contentName)
  const updatedContents = validFile.contents.toSpliced(index, 1, {
    ...validFile.contents[index],
    [keyToUpdate]: value,
  })

  return { ...validFile, contents: updatedContents }
}
