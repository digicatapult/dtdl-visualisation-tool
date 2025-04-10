import knex from 'knex'
import { container, singleton } from 'tsyringe'
import { z } from 'zod'

import { Env } from '../server/env/index.js'
import Zod, { IDatabase, Models, TABLE, tablesList, Update, Where } from './types.js'
import { reduceWhere } from './util.js'

const env = container.resolve(Env)
const clientSingleton = knex({
  client: 'pg',
  connection: {
    host: env.get('DB_HOST'),
    database: env.get('DB_NAME'),
    user: env.get('DB_USERNAME'),
    password: env.get('DB_PASSWORD'),
    port: env.get('DB_PORT'),
  },
  pool: {
    min: 2,
    max: 10,
  },
  migrations: {
    tableName: 'migrations',
  },
})

@singleton()
export default class Database {
  private db: IDatabase

  constructor(private client = clientSingleton) {
    const models: IDatabase = tablesList.reduce((acc, name) => {
      return {
        [name]: () => this.client(name),
        ...acc,
      }
    }, {}) as IDatabase
    this.db = models
  }

  insert = async <M extends TABLE>(
    model: M,
    record: Models[typeof model]['insert']
  ): Promise<Models[typeof model]['get'][]> => {
    return z.array(Zod[model].get).parse(await this.db[model]().insert(record).returning('*'))
  }

  get = async <M extends TABLE>(model: M, where?: Where<M>, limit?: number): Promise<Models[typeof model]['get'][]> => {
    let query = this.db[model]()
    query = reduceWhere(query, where)
    if (limit !== undefined) query = query.limit(limit)
    const result = await query
    return z.array(Zod[model].get).parse(result)
  }

  update = async <M extends TABLE>(
    model: M,
    where: Where<M>,
    updates: Update<M>
  ): Promise<Models[typeof model]['get'][]> => {
    let query = this.db[model]().update({
      ...updates,
    })
    query = reduceWhere(query, where)

    return z.array(Zod[model].get).parse(await query.returning('*'))
  }

  getJsonb = async <M extends TABLE>(
    model: M,
    jsonbProcess: string,
    column: string,
    jsonbExpression: string,
    bindings: string[],
    where?: Where<M>,
    limit?: number
  ): Promise<Models[typeof model]['get'][]> => {
    let query = this.db[model]()

    const preparedExpression = this.client.raw(jsonbExpression, bindings)
    query = query.whereRaw(`${jsonbProcess}(??, '??')`, [column, preparedExpression])

    query = reduceWhere(query, where)

    if (limit !== undefined) query = query.limit(limit)

    const result = await query
    return z.array(Zod[model].get).parse(result)
  }

  withTransaction = <T>(update: (db: Database) => Promise<T>): Promise<T> => {
    return this.client.transaction(async (trx) => {
      const decorated = new Database(trx)
      return await update(decorated)
    })
  }

  delete = async <M extends TABLE>(model: M, where: Where<M>): Promise<void> => {
    return this.db[model]().where(where).delete()
  }
}

container.register(Database, { useValue: new Database() })
