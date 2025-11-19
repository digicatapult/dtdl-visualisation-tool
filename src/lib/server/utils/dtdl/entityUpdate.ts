import { z } from 'zod'
import { DtdlInterface, dtdlInterfaceBase, NullableDtdlSource } from '../../../db/types.js'
import { DataError } from '../../errors.js'
import { DtdlSchema } from '../../models/strings.js'

const invalidChars = /["\\]/
export const MAX_VALUE_LENGTH = 512 // DTDL spec
export const MAX_DISPLAY_NAME_LENGTH = 64 // lower than DTDL spec limit (512) to avoid visual issues of long display names

export const updateDisplayName = (value: string) => (dtdlInterface: DtdlInterface) => {
  return updateInterfaceValue(dtdlInterface, value, `displayName`, MAX_DISPLAY_NAME_LENGTH)
}

export const updateDescription = (value: string) => (dtdlInterface: DtdlInterface) => {
  return updateInterfaceValue(dtdlInterface, value, `description`, MAX_VALUE_LENGTH)
}

export const updateComment = (value: string) => (dtdlInterface: DtdlInterface) => {
  return updateInterfaceValue(dtdlInterface, value, `comment`, MAX_VALUE_LENGTH)
}

export const updateRelationshipDisplayName =
  (value: string, relationshipName: string) => (dtdlInterface: DtdlInterface) => {
    return updateContentsValue(
      dtdlInterface,
      value,
      'Relationship',
      relationshipName,
      'displayName',
      MAX_DISPLAY_NAME_LENGTH
    )
  }

export const updateRelationshipDescription =
  (value: string, relationshipName: string) => (dtdlInterface: DtdlInterface) => {
    return updateContentsValue(dtdlInterface, value, 'Relationship', relationshipName, 'description', MAX_VALUE_LENGTH)
  }

export const updateRelationshipComment =
  (value: string, relationshipName: string) => (dtdlInterface: DtdlInterface) => {
    return updateContentsValue(dtdlInterface, value, 'Relationship', relationshipName, 'comment', MAX_VALUE_LENGTH)
  }

export const updatePropertyDisplayName = (value: string, propertyName: string) => (dtdlInterface: DtdlInterface) => {
  return updateContentsValue(dtdlInterface, value, 'Property', propertyName, 'displayName', MAX_DISPLAY_NAME_LENGTH)
}

export const updatePropertyDescription = (value: string, propertyName: string) => (dtdlInterface: DtdlInterface) => {
  return updateContentsValue(dtdlInterface, value, 'Property', propertyName, 'description', MAX_VALUE_LENGTH)
}

export const updatePropertyComment = (value: string, propertyName: string) => (dtdlInterface: DtdlInterface) => {
  return updateContentsValue(dtdlInterface, value, 'Property', propertyName, 'comment', MAX_VALUE_LENGTH)
}

export const updatePropertySchema = (value: DtdlSchema, propertyName: string) => (dtdlInterface: DtdlInterface) => {
  return updateContentsValue(dtdlInterface, value, 'Property', propertyName, 'schema', MAX_VALUE_LENGTH)
}

export const updateRelationshipTarget =
  (newTarget: string, relationshipName: string) => (dtdlInterface: DtdlInterface) => {
    if (!newTarget.trim()) throw new DataError('Target cannot be empty')
    return updateContentsValue(dtdlInterface, newTarget, 'Relationship', relationshipName, 'target', MAX_VALUE_LENGTH)
  }

export const updatePropertyWritable = (value: boolean, propertyName: string) => (dtdlInterface: DtdlInterface) => {
  return updateContentsValue(dtdlInterface, value, 'Property', propertyName, 'writable')
}

export const updateTelemetryComment = (value: string, telemetryName: string) => (dtdlInterface: DtdlInterface) => {
  return updateContentsValue(dtdlInterface, value, 'Telemetry', telemetryName, 'comment', MAX_VALUE_LENGTH)
}

export const updateTelemetryDescription = (value: string, telemetryName: string) => (dtdlInterface: DtdlInterface) => {
  return updateContentsValue(dtdlInterface, value, 'Telemetry', telemetryName, 'description', MAX_VALUE_LENGTH)
}

export const updateTelemetryDisplayName = (value: string, telemetryName: string) => (dtdlInterface: DtdlInterface) => {
  return updateContentsValue(dtdlInterface, value, 'Telemetry', telemetryName, 'displayName', MAX_DISPLAY_NAME_LENGTH)
}

export const updateTelemetrySchema = (value: DtdlSchema, telemetryName: string) => (dtdlInterface: DtdlInterface) => {
  return updateContentsValue(dtdlInterface, value, 'Telemetry', telemetryName, 'schema', MAX_VALUE_LENGTH)
}

export const updateCommandDisplayName = (value: string, commandName: string) => (dtdlInterface: DtdlInterface) => {
  return updateContentsValue(dtdlInterface, value, 'Command', commandName, 'displayName', MAX_DISPLAY_NAME_LENGTH)
}

export const updateCommandComment = (value: string, commandName: string) => (dtdlInterface: DtdlInterface) => {
  return updateContentsValue(dtdlInterface, value, 'Command', commandName, 'comment', MAX_VALUE_LENGTH)
}

export const updateCommandDescription = (value: string, commandName: string) => (dtdlInterface: DtdlInterface) => {
  return updateContentsValue(dtdlInterface, value, 'Command', commandName, 'description', MAX_VALUE_LENGTH)
}

// Command Request update functions
export const updateCommandRequestDisplayName =
  (value: string, commandName: string) => (dtdlInterface: DtdlInterface) => {
    return updateCommandRequestResponseValue(
      dtdlInterface,
      value,
      commandName,
      'request',
      'displayName',
      MAX_DISPLAY_NAME_LENGTH
    )
  }

export const updateCommandRequestComment = (value: string, commandName: string) => (dtdlInterface: DtdlInterface) => {
  return updateCommandRequestResponseValue(dtdlInterface, value, commandName, 'request', 'comment', MAX_VALUE_LENGTH)
}

export const updateCommandRequestDescription =
  (value: string, commandName: string) => (dtdlInterface: DtdlInterface) => {
    return updateCommandRequestResponseValue(
      dtdlInterface,
      value,
      commandName,
      'request',
      'description',
      MAX_VALUE_LENGTH
    )
  }

export const updateCommandRequestSchema =
  (value: DtdlSchema, commandName: string) => (dtdlInterface: DtdlInterface) => {
    return updateCommandRequestResponseValue(dtdlInterface, value, commandName, 'request', 'schema', MAX_VALUE_LENGTH)
  }

// Command Response update functions
export const updateCommandResponseDisplayName =
  (value: string, commandName: string) => (dtdlInterface: DtdlInterface) => {
    return updateCommandRequestResponseValue(
      dtdlInterface,
      value,
      commandName,
      'response',
      'displayName',
      MAX_DISPLAY_NAME_LENGTH
    )
  }

export const updateCommandResponseComment = (value: string, commandName: string) => (dtdlInterface: DtdlInterface) => {
  return updateCommandRequestResponseValue(dtdlInterface, value, commandName, 'response', 'comment', MAX_VALUE_LENGTH)
}

export const updateCommandResponseDescription =
  (value: string, commandName: string) => (dtdlInterface: DtdlInterface) => {
    return updateCommandRequestResponseValue(
      dtdlInterface,
      value,
      commandName,
      'response',
      'description',
      MAX_VALUE_LENGTH
    )
  }

export const updateCommandResponseSchema =
  (value: DtdlSchema, commandName: string) => (dtdlInterface: DtdlInterface) => {
    return updateCommandRequestResponseValue(dtdlInterface, value, commandName, 'response', 'schema', MAX_VALUE_LENGTH)
  }

const updateInterfaceValue = (
  dtdlInterface: DtdlInterface,
  value: string,
  keyToUpdate: 'displayName' | 'description' | 'comment',
  maxLength: number
) => {
  if (invalidChars.test(value)) throw new DataError(`Invalid JSON: '${value}'`)

  if (value.length > maxLength) throw new DataError(`${keyToUpdate} has max length of ${maxLength} characters`)

  return { ...dtdlInterface, [keyToUpdate]: value }
}

const updateContentsValue = (
  dtdlInterface: DtdlInterface,
  value: string | boolean,
  contentType: 'Relationship' | 'Property' | 'Telemetry' | 'Command',
  contentName: string, // effectively contentId - has to be unique in DTDL
  keyToUpdate: 'displayName' | 'description' | 'comment' | 'schema' | 'writable' | 'request' | 'response' | 'target',
  maxLength = MAX_VALUE_LENGTH
) => {
  if (typeof value === 'string' && invalidChars.test(value)) throw new DataError(`Invalid JSON: '${value}'`)

  if (typeof value === 'string' && value.length > maxLength)
    throw new DataError(`${contentType} '${keyToUpdate}' has max length of ${maxLength} characters`)

  const schema = dtdlInterfaceBase.extend({
    contents: z
      .array(
        z.looseObject({
          '@type': z.string(),
          name: z.string(),
        })
      )
      .refine((contents) => contents.some((c) => c['@type'] === contentType && c.name === contentName)),
  })
  const validInterface: z.infer<typeof schema> = schema.loose().parse(dtdlInterface)

  const index = validInterface.contents.findIndex((item) => item['@type'] === contentType && item.name === contentName)
  const updatedContents = validInterface.contents.toSpliced(index, 1, {
    ...validInterface.contents[index],
    [keyToUpdate]: value,
  })

  return { ...validInterface, contents: updatedContents }
}

export const deleteContent = (contentName: string) => (dtdlInterface: DtdlInterface) => {
  const schema = dtdlInterfaceBase.extend({
    contents: z
      .array(
        z.looseObject({
          name: z.string(),
        })
      )
      .refine((contents) => contents.some((c) => c.name === contentName)),
  })

  const validInterface: z.infer<typeof schema> = schema.loose().parse(dtdlInterface)

  const index = validInterface.contents.findIndex((item) => item.name === contentName)
  const updatedContents = validInterface.contents.toSpliced(index, 1)

  return { ...validInterface, contents: updatedContents }
}

export const deleteInterface = (interfaceId: string, source: NullableDtdlSource): NullableDtdlSource => {
  if (source === null || !Array.isArray(source) || source.length === 1) {
    return null // delete whole file
  }
  const index = source.findIndex((entity) => entity['@id'] === interfaceId)
  if (index === -1) {
    throw new DataError(`Interface with id ${interfaceId} not found in source`)
  }
  return source.toSpliced(index, 1)
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

  const schema = dtdlInterfaceBase.extend({
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

  const updatedRequestResponse = { ...requestResponseProperty }

  updatedRequestResponse[keyToUpdate] = value
  const updatedCommand = {
    ...command,
    [requestOrResponse]: updatedRequestResponse,
  }
  const updatedContents = validFile.contents.toSpliced(commandIndex, 1, updatedCommand)
  return { ...validFile, contents: updatedContents }
}
