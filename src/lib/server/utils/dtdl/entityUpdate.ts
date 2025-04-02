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
  contentType: 'Relationship' | 'Property',
  contentName: string, // effectively contentId - has to be unique in DTDL
  keyToUpdate: 'displayName' | 'description' | 'comment',
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
        contents.some((c) => c['@type'] === contentType && c.name === contentName && c[keyToUpdate] !== undefined)
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
