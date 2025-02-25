import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('model', (table) => {
    table.text('source').nullable()
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('model', (table) => {
    table.dropColumn('source')
  })
}
