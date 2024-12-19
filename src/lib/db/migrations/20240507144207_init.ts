import { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  const [extInstalled] = await knex('pg_extension').select('*').where({ extname: 'uuid-ossp' })

  if (!extInstalled) await knex.raw('CREATE EXTENSION "uuid-ossp"')
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw('DROP EXTENSION "uuid-ossp"')
}
