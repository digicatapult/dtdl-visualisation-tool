import { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('dtdl', (table) => {
    table.renameColumn('contents', 'source')
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('dtdl', (table) => {
    table.renameColumn('source', 'contents')
  })
}
