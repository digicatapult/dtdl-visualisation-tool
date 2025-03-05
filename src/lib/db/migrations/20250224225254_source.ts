import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('model', (table) => {
    table.text('source').nullable()
    table.text('owner').nullable()
    table.text('repo').nullable()
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('model', (table) => {
    table.dropColumn('source')
    table.dropColumn('owner')
    table.dropColumn('repo')
  })
}
