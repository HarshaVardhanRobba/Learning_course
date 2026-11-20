import { config } from 'dotenv'
import { defineConfig } from 'drizzle-kit'

config({ path: '.env.local' })

// Migrations must use the direct (non-pooled) connection; PgBouncer's transaction mode breaks session state.
const url = process.env.DATABASE_URL_UNPOOLED
if (!url) throw new Error('DATABASE_URL_UNPOOLED is not set. Run `neon env pull` in apps/web.')

export default defineConfig({
  schema: './db/schema.ts',
  out: './db/migrations',
  dialect: 'postgresql',
  dbCredentials: { url },
  strict: true,
})
