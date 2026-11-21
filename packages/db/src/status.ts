/**
 * Compares the local migration journal with what the Neon database has applied.
 * Exits with code 1 when migrations are pending. Run with `npm run db:status`.
 */
import { readFileSync } from 'node:fs'
import { config } from 'dotenv'
import { Pool } from '@neondatabase/serverless'

config({ path: '../../apps/web/.env.local' })

type Journal = { entries: { idx: number; when: number; tag: string }[] }

async function main() {
  const url = process.env.DATABASE_URL_UNPOOLED
  if (!url) throw new Error('DATABASE_URL_UNPOOLED is not set. Run `neon env pull` in apps/web.')

  const journal = JSON.parse(readFileSync(new URL('../drizzle/meta/_journal.json', import.meta.url), 'utf8')) as Journal
  const pool = new Pool({ connectionString: url })

  try {
    const host = new URL(url).host
    // drizzle-kit records each applied migration with created_at = the journal entry's `when`.
    const applied = await pool
      .query<{ created_at: string }>('select created_at from drizzle.__drizzle_migrations')
      .then((r) => new Set(r.rows.map((row) => Number(row.created_at))))
      .catch(() => new Set<number>())
    const tables = await pool.query<{ table_name: string }>(
      "select table_name from information_schema.tables where table_schema = 'public' order by 1",
    )

    console.log(`Database: ${host}\n`)
    let pending = 0
    for (const entry of journal.entries) {
      const done = applied.has(entry.when)
      if (!done) pending += 1
      console.log(`  ${done ? '[applied]' : '[PENDING]'} ${entry.tag}`)
    }
    console.log(`\nTables (${tables.rows.length}): ${tables.rows.map((r) => r.table_name).join(', ')}`)

    if (pending) {
      console.log(`\n${pending} pending migration(s). Run: npm run db:migrate`)
      process.exitCode = 1
    } else {
      console.log('\nDatabase is up to date.')
    }
  } finally {
    await pool.end()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
