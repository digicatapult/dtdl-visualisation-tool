import { Knex } from 'knex'
import { z } from 'zod'

export const tablesList = ['model'] as const

const insertModel = z.object({
  name: z.string(),
  parsed: z.object({}),
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

export type IDatabase = {
  [key in TABLE]: () => Knex.QueryBuilder
}

export default Zod
