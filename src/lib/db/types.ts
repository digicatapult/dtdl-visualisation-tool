import { Knex } from 'knex'
import { z } from 'zod'
import { fileSource } from '../server/models/openTypes.js'

export const tablesList = ['model', 'dtdl'] as const

const insertModel = z.object({
  name: z.string(),
  preview: z.string().nullable(),
  source: z.enum(fileSource),
  owner: z.string().nullable(),
  repo: z.string().nullable(),
})

const insertDtdl = z.object({
  path: z.string(),
  model_id: z.string(),
  contents: z.unknown().refine((value) => value !== null && value !== undefined),
})

const Zod = {
  model: {
    insert: insertModel,
    get: insertModel.extend({
      id: z.string(),
      created_at: z.date(),
    }),
  },
  dtdl: {
    insert: insertDtdl,
    get: insertDtdl.extend({
      id: z.string(),
      created_at: z.date(),
    }),
  },
}

export type InsertModel = z.infer<typeof Zod.model.insert>
export type ModelRow = z.infer<typeof Zod.model.get>

export type InsertDtdl = z.infer<typeof Zod.dtdl.insert>
export type DtdlRow = z.infer<typeof Zod.dtdl.get>
export type DtdlFile = {
  path: string
  contents: string
}

export type TABLES_TUPLE = typeof tablesList
export type TABLE = TABLES_TUPLE[number]
export type Models = {
  [key in TABLE]: {
    get: z.infer<(typeof Zod)[key]['get']>
    insert: z.infer<(typeof Zod)[key]['insert']>
  }
}

type WhereComparison<M extends TABLE> = {
  [key in keyof Models[M]['get']]: [
    Extract<key, string>,
    '=' | '>' | '>=' | '<' | '<=' | '<>' | 'LIKE' | 'ILIKE',
    Extract<Models[M]['get'][key], Knex.Value>,
  ]
}
export type WhereMatch<M extends TABLE> = {
  [key in keyof Models[M]['get']]?: Models[M]['get'][key]
}

export type Where<M extends TABLE> = WhereMatch<M> | (WhereMatch<M> | WhereComparison<M>[keyof Models[M]['get']])[]
export type Update<M extends TABLE> = Partial<Models[M]['get']>

export type IDatabase = {
  [key in TABLE]: () => Knex.QueryBuilder
}

export default Zod
