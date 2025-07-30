import { DtdlObjectModel } from '@digicatapult/dtdl-parser'
import { z } from 'zod'

const entityParser = z
  .object({
    EntityKind: z.string(),
    Id: z.string(),
  })
  .loose()
// This is inherently breaking the type safety of this parser, should be fixed by NIDT-155 https://digicatapult.atlassian.net/browse/NIDT-155
export const dtdlObjectModelParser = z
  .record(z.string(), entityParser)
  .transform((data) => data as unknown as DtdlObjectModel)
