import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.raw(
    "DELETE FROM model WHERE id IN (SELECT id FROM model WHERE name = 'default' OR source = 'default' ORDER BY created_at DESC OFFSET 1)"
  )
}

export async function down(): Promise<void> {}
