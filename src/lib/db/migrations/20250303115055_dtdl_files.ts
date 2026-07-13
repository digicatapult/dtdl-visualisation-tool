import { Knex } from 'knex'
import { fileSource } from '../../server/models/openTypes.js'

export async function up(knex: Knex): Promise<void> {
  const now = () => knex.fn.now()

  await knex('model').delete()

  await knex.schema.alterTable('model', (def) => {
    def.dropColumn('source')
  })

  await knex.schema.alterTable('model', (def) => {
    def.primary(['id'])
    def.enum('source', fileSource).notNullable()
    def.dropColumn('parsed')
  })

  await knex.schema.createTable('dtdl', (def) => {
    def.uuid('id').defaultTo(knex.raw('uuid_generate_v4()')).primary()
    def.string('path').notNullable()
    def.uuid('model_id').notNullable()
    def.jsonb('contents').notNullable()
    def.datetime('created_at').notNullable().defaultTo(now())

    def.foreign('model_id').references('id').inTable('model').onDelete('CASCADE').onUpdate('CASCADE')
  })

  await knex.schema.raw(`CREATE INDEX dtdl_model_id_idx ON dtdl (model_id);`)
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('dtdl')

  // Reverse the up: drop the primary key and the not-null `source`, restore
  // `parsed`, then re-add `source` as nullable. The previous down re-added
  // `source` without dropping the existing column first, so it failed with
  // "column source already exists" on rollback, and it never restored `parsed`.
  await knex.schema.alterTable('model', (def) => {
    def.dropPrimary()
    def.dropColumn('source')
    def.jsonb('parsed').notNullable()
  })

  await knex.schema.alterTable('model', (def) => {
    def.enum('source', fileSource).nullable()
  })
}
