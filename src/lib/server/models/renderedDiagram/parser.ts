import { z } from 'zod'

import { MermaidSvgRender } from './mermaidSvg.js'
import { PlainTextRender } from './plaintext.js'

export const parser = z
  .discriminatedUnion('type', [
    z.object({
      type: z.literal('text'),
      content: z.string(),
    }),
    z.object({
      type: z.literal('svg'),
      content: z.string(),
    }),
  ])
  .transform((obj) => {
    switch (obj.type) {
      case 'svg':
        return new MermaidSvgRender(Buffer.from(obj.content))
      case 'text':
        return new PlainTextRender(obj.content)
    }
  })
