import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('model', (table) => {
    table.text('base_branch').nullable()
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('model', (table) => {
    table.dropColumn('base_branch')
  })
}
