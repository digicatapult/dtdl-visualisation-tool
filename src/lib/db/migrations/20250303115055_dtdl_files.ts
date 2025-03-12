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
    def.jsonb('contents').notNullable()
    def.datetime('created_at').notNullable().defaultTo(now())

    def.foreign('model_id').references('id').inTable('model').onDelete('CASCADE').onUpdate('CASCADE')
  })

  await knex.schema.raw(`
    CREATE INDEX dtdl_contents_gin ON dtdl USING GIN (contents jsonb_path_ops);
  `)
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('dtdl')

  await knex.schema.alterTable('model', (def) => {
    def.dropPrimary()
  })
}
