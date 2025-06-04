import { DtdlObjectModel } from '@digicatapult/dtdl-parser'
import { z } from 'zod'

const entityParser = z
  .object({
    EntityKind: z.string(),
    Id: z.string(),
  })
  .passthrough()

export const dtdlObjectModelParser = z.record(entityParser).transform((data) => data as unknown as DtdlObjectModel)
