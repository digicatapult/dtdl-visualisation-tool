import { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  const now = () => knex.fn.now()

  await knex.schema.createTable('model', (def) => {
    def.uuid('id').defaultTo(knex.raw('uuid_generate_v4()'))
    def.string('name').notNullable()
    def.jsonb('parsed').notNullable()

    def.datetime('created_at').notNullable().defaultTo(now())
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('model')
}
