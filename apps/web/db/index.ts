import 'server-only'
import { Pool } from '@neondatabase/serverless'
import { parseEnv } from '@neon/env'
import { drizzle } from 'drizzle-orm/neon-serverless'
import neonConfig from '@/neon'
import * as schema from './schema'

function createDb() {
  const { postgres } = parseEnv(neonConfig, ['DATABASE_URL'])
  // Pooled URL for app traffic; WebSocket pool (not neon-http) because it supports interactive transactions.
  return drizzle(new Pool({ connectionString: postgres.databaseUrl }), { schema })
}

export type Db = ReturnType<typeof createDb>

const globalForDb = globalThis as unknown as { db?: Db }

export function getDb(): Db {
  globalForDb.db ??= createDb()
  return globalForDb.db
}
