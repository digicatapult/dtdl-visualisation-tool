import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('model', (table) => {
    table.text('commit_hash').nullable()
    table.boolean('is_out_of_sync').defaultTo(false)
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('model', (table) => {
    table.dropColumn('commit_hash')
    table.dropColumn('is_out_of_sync')
  })
}
