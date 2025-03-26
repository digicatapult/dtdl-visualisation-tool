import { z } from 'zod'
import { DataError } from '../../errors.js'

export const updateDisplayName = (value: string) => (contents: unknown) => {
  if (value.length > 64) throw new DataError(`Display name has max length of 64 characters`)

  const schema = z.object({
    '@type': z.literal('Interface'),
    displayName: z.string(),
  })

  const validContents: z.infer<typeof schema> = schema.passthrough().parse(contents)
  validContents.displayName = value
  return validContents
}

export const updateDescription = (value: string) => (contents: unknown) => {
  if (value.length > 512) throw new DataError(`Description has max length of 512 characters`)

  const schema = z.object({
    '@type': z.literal('Interface'),
    description: z.string(),
  })

  const validContents: z.infer<typeof schema> = schema.passthrough().parse(contents)
  validContents.description = value
  return validContents
}

export const updateInterfaceComment = (value: string) => (contents: unknown) => {
  if (value.length > 512) throw new DataError(`Interface comment has max length of 512 characters`)

  const schema = z.object({
    '@type': z.literal('Interface'),
    comment: z.string(),
  })

  const validContents: z.infer<typeof schema> = schema.passthrough().parse(contents)
  validContents.comment = value
  return validContents
}
