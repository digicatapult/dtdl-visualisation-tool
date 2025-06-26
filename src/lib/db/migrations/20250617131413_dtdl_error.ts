import { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  const now = () => knex.fn.now()

  await knex.schema.createTable('dtdl_error', (def) => {
    def.uuid('id').defaultTo(knex.raw('uuid_generate_v4()')).primary()
    def.uuid('dtdl_id').notNullable()
    def.jsonb('error').notNullable()
    def.datetime('created_at').notNullable().defaultTo(now())

    def.foreign('dtdl_id').references('id').inTable('dtdl').onDelete('CASCADE').onUpdate('CASCADE')
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('dtdl_error')
}
