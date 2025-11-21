import { ModelingException } from '@digicatapult/dtdl-parser'
import { Knex } from 'knex'
import { z } from 'zod'
import { fileSource } from '../server/models/openTypes.js'

export const DEFAULT_DB_STRING_LENGTH = 255
export const tablesList = ['model', 'dtdl', 'dtdl_error'] as const

const insertModel = z.object({
  name: z.string(),
  preview: z.string().nullable(),
  source: z.enum(fileSource),
  owner: z.string().nullable(),
  repo: z.string().nullable(),
})

export const dtdlInterfaceBase = z.looseObject({ '@id': z.string(), '@type': z.literal('Interface') })
export type DtdlInterface = z.infer<typeof dtdlInterfaceBase>
export const dtdlSource = z.union([dtdlInterfaceBase, z.array(dtdlInterfaceBase)])
export type DtdlSource = z.infer<typeof dtdlSource>
export type NullableDtdlSource = DtdlSource | null

const insertDtdl = z.object({
  path: z.string(),
  model_id: z.string(),
  source: z.string(),
})

const ParsingError = z.object({
  PrimaryID: z
    .string()
    .nullable()
    .transform((val) => val ?? undefined)
    .optional(),
  SecondaryID: z
    .string()
    .nullable()
    .transform((val) => val ?? undefined)
    .optional(),
  Property: z
    .string()
    .nullable()
    .transform((val) => val ?? undefined)
    .optional(),
  AuxProperty: z
    .string()
    .nullable()
    .transform((val) => val ?? undefined)
    .optional(),
  Type: z
    .string()
    .nullable()
    .transform((val) => val ?? undefined)
    .optional(),
  Value: z
    .string()
    .nullable()
    .transform((val) => val ?? undefined)
    .optional(),
  Restriction: z
    .string()
    .nullable()
    .transform((val) => val ?? undefined)
    .optional(),
  Transformation: z
    .string()
    .nullable()
    .transform((val) => val ?? undefined)
    .optional(),
  Violations: z
    .array(z.string())
    .nullable()
    .transform((val) => val ?? undefined)
    .optional(),
  Cause: z.string(),
  Action: z.string(),
  ValidationID: z.string(),
})

const ParsingException = z.object({
  ExceptionKind: z.literal('Parsing'),
  Errors: z.array(ParsingError),
})

const ResolutionException = z.object({
  ExceptionKind: z.literal('Resolution'),
  UndefinedIdentifiers: z.array(z.string()),
})

const insertDtdlError = z.object({
  dtdl_id: z.string(),
  error: z.discriminatedUnion('ExceptionKind', [ParsingException, ResolutionException]),
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
      source: dtdlSource.refine((value) => value !== null && value !== undefined),
    }),
  },
  dtdl_error: {
    insert: insertDtdlError,
    get: insertDtdlError.extend({
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
  source: string
  errors?: ModelingException[]
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
export type Update<M extends TABLE> = Partial<Models[M]['insert']>

export type IDatabase = {
  [key in TABLE]: () => Knex.QueryBuilder
}

export default Zod
