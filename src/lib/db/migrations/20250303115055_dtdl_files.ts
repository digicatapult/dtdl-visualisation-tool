import { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  const now = () => knex.fn.now()

  await knex.schema.alterTable('model', (def) => {
    def.primary(['id'])
  })

  await knex.schema.createTable('dtdl', (def) => {
    def.uuid('id').defaultTo(knex.raw('uuid_generate_v4()')).primary()
    def.string('path').notNullable()
    def.uuid('model_id').notNullable()
    def.specificType('entity_ids', 'text[]').notNullable()
    def.jsonb('contents').notNullable()
    def.datetime('created_at').notNullable().defaultTo(now())
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('dtdl')

  await knex.schema.alterTable('model', (def) => {
    def.dropPrimary()
  })
}
