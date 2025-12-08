import { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('dtdl', (table) => {
    table.json('source').alter()
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('dtdl', (table) => {
    table.jsonb('source').alter()
  })
}
