import { z } from 'zod'
import { DataError } from '../../errors.js'

export type UpdateType = keyof typeof updateMap

const updateDisplayName = (contents: unknown, _oldValue: string, newValue: string) => {
  if (newValue.length > 64) throw new DataError(`Display name has max length of 64 characters`)

  const schema = z.object({
    '@type': z.literal('Interface'),
    displayName: z.string(),
  })

  const validContents: z.infer<typeof schema> = schema.passthrough().parse(contents)
  validContents.displayName = newValue
  return validContents
}

const updateDescription = (contents: unknown, _oldValue: string, newValue: string) => {
  if (newValue.length > 512) throw new DataError(`Description has max length of 512 characters`)

  const schema = z.object({
    '@type': z.literal('Interface'),
    description: z.string(),
  })

  const validContents: z.infer<typeof schema> = schema.passthrough().parse(contents)
  validContents.description = newValue
  return validContents
}

const updateInterfaceComment = (contents: unknown, _oldValue: string, newValue: string) => {
  if (newValue.length > 512) throw new DataError(`Interface comment has max length of 512 characters`)

  const schema = z.object({
    '@type': z.literal('Interface'),
    comment: z.string(),
  })

  const validContents: z.infer<typeof schema> = schema.passthrough().parse(contents)
  validContents.comment = newValue
  return validContents
}

export const updateMap = {
  displayName: updateDisplayName,
  description: updateDescription,
  interfaceComment: updateInterfaceComment,
} as const
