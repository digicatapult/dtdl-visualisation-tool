import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex('model')
    .where('name', 'default')
    .andWhere('id', '!=', () => {
      knex.select('id').from('model').where('name', 'default').orderBy('created_at', 'desc').limit(1)
    })
    .del()
}
