import type { Knex } from 'knex'
import { fileSource } from '../../server/models/openTypes.js'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('model', (table) => {
    table.enum('source', [...fileSource]).nullable()
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('model', (table) => {
    table.dropColumn('source')
    table.dropColumn('owner')
    table.dropColumn('repo')
  })
}
