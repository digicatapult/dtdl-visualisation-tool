import { Knex } from 'knex'
import { z } from 'zod'

export const tablesList = ['model'] as const

const insertModel = z.object({
  name: z.string(),
  parsed: z.unknown(),
  preview: z.string().nullable(),
  source: z.union([z.literal('default'), z.literal('zip'), z.literal('github')]).nullable(),
  owner: z.string().nullable(),
  repo: z.string().nullable(),
})

const Zod = {
  model: {
    insert: insertModel,
    get: insertModel.extend({
      id: z.string(),
      created_at: z.date(),
    }),
  },
}

export type InsertModel = z.infer<typeof Zod.model.insert>
export type ModelRow = z.infer<typeof Zod.model.get>

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

export type IDatabase = {
  [key in TABLE]: () => Knex.QueryBuilder
}

export default Zod
