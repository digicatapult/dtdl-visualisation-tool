import { z } from 'zod'
import { DtdlInterface, dtdlInterfaceBase, DtdlSourceOrEmpty } from '../../../db/types.js'
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
  contentType: 'Relationship' | 'Property' | 'Telemetry',
  contentName: string, // effectively contentId - has to be unique in DTDL
  keyToUpdate: 'displayName' | 'description' | 'comment' | 'schema' | 'writable',
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

export const deleteInterface = (interfaceId: string, source: DtdlSourceOrEmpty): DtdlSourceOrEmpty => {
  if (source === '' || !Array.isArray(source) || source.length === 1) {
    return '' // delete whole file
  }
  const index = source.findIndex((entity) => entity['@id'] === interfaceId)
  if (index === -1) {
    throw new DataError(`Interface with id ${interfaceId} not found in source`)
  }
  return source.toSpliced(index, 1)
}
