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

export const updateRelationshipTarget = (newTarget: string, relationshipName: string) => (file: unknown) => {
  if (!newTarget.trim()) throw new DataError('Target cannot be empty')
  return updateContentsValue(file, newTarget, 'Relationship', relationshipName, 'target', MAX_VALUE_LENGTH)
}

export const updatePropertyDisplayName = (value: string, propertyName: string) => (file: unknown) => {
  return updateContentsValue(file, value, 'Property', propertyName, 'displayName', MAX_DISPLAY_NAME_LENGTH)
}

export const updatePropertyDescription = (value: string, propertyName: string) => (file: unknown) => {
  return updateContentsValue(file, value, 'Property', propertyName, 'description', MAX_VALUE_LENGTH)
}

export const updatePropertyComment = (value: string, propertyName: string) => (file: unknown) => {
  return updateContentsValue(file, value, 'Property', propertyName, 'comment', MAX_VALUE_LENGTH)
}

export const updatePropertySchema = (value: DtdlSchema, propertyName: string) => (file: unknown) => {
  return updateContentsValue(file, value, 'Property', propertyName, 'schema', MAX_VALUE_LENGTH)
}

export const updatePropertyWritable = (value: boolean, propertyName: string) => (file: unknown) => {
  return updateContentsValue(file, value, 'Property', propertyName, 'writable')
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
export const updateCommandDisplayName = (value: string, commandName: string) => (file: unknown) => {
  return updateContentsValue(file, value, 'Command', commandName, 'displayName', MAX_DISPLAY_NAME_LENGTH)
}
export const updateCommandComment = (value: string, commandName: string) => (file: unknown) => {
  return updateContentsValue(file, value, 'Command', commandName, 'comment', MAX_VALUE_LENGTH)
}
export const updateCommandDescription = (value: string, commandName: string) => (file: unknown) => {
  return updateContentsValue(file, value, 'Command', commandName, 'description', MAX_VALUE_LENGTH)
}

// Command Request update functions
export const updateCommandRequestDisplayName = (value: string, commandName: string) => (file: unknown) => {
  return updateCommandRequestResponseValue(file, value, commandName, 'request', 'displayName', MAX_DISPLAY_NAME_LENGTH)
}

export const updateCommandRequestComment = (value: string, commandName: string) => (file: unknown) => {
  return updateCommandRequestResponseValue(file, value, commandName, 'request', 'comment', MAX_VALUE_LENGTH)
}

export const updateCommandRequestDescription = (value: string, commandName: string) => (file: unknown) => {
  return updateCommandRequestResponseValue(file, value, commandName, 'request', 'description', MAX_VALUE_LENGTH)
}

export const updateCommandRequestSchema = (value: DtdlSchema, commandName: string) => (file: unknown) => {
  return updateCommandRequestResponseValue(file, value, commandName, 'request', 'schema', MAX_VALUE_LENGTH)
}

// Command Response update functions
export const updateCommandResponseDisplayName = (value: string, commandName: string) => (file: unknown) => {
  return updateCommandRequestResponseValue(file, value, commandName, 'response', 'displayName', MAX_DISPLAY_NAME_LENGTH)
}

export const updateCommandResponseComment = (value: string, commandName: string) => (file: unknown) => {
  return updateCommandRequestResponseValue(file, value, commandName, 'response', 'comment', MAX_VALUE_LENGTH)
}

export const updateCommandResponseDescription = (value: string, commandName: string) => (file: unknown) => {
  return updateCommandRequestResponseValue(file, value, commandName, 'response', 'description', MAX_VALUE_LENGTH)
}

export const updateCommandResponseSchema = (value: DtdlSchema, commandName: string) => (file: unknown) => {
  return updateCommandRequestResponseValue(file, value, commandName, 'response', 'schema', MAX_VALUE_LENGTH)
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

  const validFile: z.infer<typeof schema> = schema.loose().parse(file)

  return { ...validFile, [keyToUpdate]: value }
}

const updateContentsValue = (
  file: unknown,
  value: string | boolean,
  contentType: 'Relationship' | 'Property' | 'Telemetry' | 'Command',
  contentName: string, // effectively contentId - has to be unique in DTDL
  keyToUpdate: 'displayName' | 'description' | 'comment' | 'schema' | 'writable' | 'request' | 'response' | 'target',
  maxLength = MAX_VALUE_LENGTH
) => {
  if (typeof value === 'string' && invalidChars.test(value)) throw new DataError(`Invalid JSON: '${value}'`)

  if (typeof value === 'string' && value.length > maxLength)
    throw new DataError(`${contentType} '${keyToUpdate}' has max length of ${maxLength} characters`)

  const schema = z.object({
    '@type': z.literal('Interface'),
    contents: z
      .array(
        z.looseObject({
          '@type': z.string(),
          name: z.string(),
        })
      )
      .refine((contents) => contents.some((c) => c['@type'] === contentType && c.name === contentName)),
  })

  const validFile: z.infer<typeof schema> = schema.loose().parse(file)

  const index = validFile.contents.findIndex((item) => item['@type'] === contentType && item.name === contentName)
  const updatedContents = validFile.contents.toSpliced(index, 1, {
    ...validFile.contents[index],
    [keyToUpdate]: value,
  })

  return { ...validFile, contents: updatedContents }
}

const updateCommandRequestResponseValue = (
  file: unknown,
  value: string | DtdlSchema,
  commandName: string,
  requestOrResponse: 'request' | 'response',
  keyToUpdate: 'displayName' | 'description' | 'comment' | 'schema',
  maxLength = MAX_VALUE_LENGTH
) => {
  if (typeof value === 'string' && invalidChars.test(value)) throw new DataError(`Invalid JSON: '${value}'`)

  if (typeof value === 'string' && value.length > maxLength)
    throw new DataError(`Command ${requestOrResponse} '${keyToUpdate}' has max length of ${maxLength} characters`)

  const schema = z.object({
    '@type': z.literal('Interface'),
    contents: z
      .array(
        z.looseObject({
          '@type': z.string(),
          name: z.string(),
          [requestOrResponse]: z.union([z.string(), z.object({}).loose()]).optional(),
        })
      )
      .refine((contents) => contents.some((c) => c['@type'] === 'Command' && c.name === commandName)),
  })
  const validFile: z.infer<typeof schema> = schema.loose().parse(file)

  const commandIndex = validFile.contents.findIndex((item) => item['@type'] === 'Command' && item.name === commandName)
  const command = validFile.contents[commandIndex]

  const objecSchema = z.object({}).loose()
  const requestResponseProperty = objecSchema.parse(command[requestOrResponse])

  if (!requestResponseProperty) {
    throw new DataError(`Command '${commandName}' has no ${requestOrResponse} defined`)
  }
  const updatedRequestResponse = { ...requestResponseProperty }

  updatedRequestResponse[keyToUpdate] = value
  const updatedCommand = {
    ...command,
    [requestOrResponse]: updatedRequestResponse,
  }
  const updatedContents = validFile.contents.toSpliced(commandIndex, 1, updatedCommand)
  return { ...validFile, contents: updatedContents }
}
export const deleteContent = (contentName: string) => (file: unknown) => {
  const schema = z.object({
    '@type': z.literal('Interface'),
    contents: z
      .array(
        z.looseObject({
          name: z.string(),
        })
      )
      .refine((contents) => contents.some((c) => c.name === contentName)),
  })

  const validFile: z.infer<typeof schema> = schema.passthrough().parse(file)

  const index = validFile.contents.findIndex((item) => item.name === contentName)
  const updatedContents = validFile.contents.toSpliced(index, 1)

  return { ...validFile, contents: updatedContents }
}
