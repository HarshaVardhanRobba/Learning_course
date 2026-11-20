import 'server-only'
import { Pool } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-serverless'
import * as schema from './schema'
import * as relations from './relations'

function createDb() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set. Run `neon env pull` in apps/web.')
  }
  // Pooled URL for app traffic; WebSocket pool (not neon-http) because it supports interactive transactions.
  return drizzle(new Pool({ connectionString }), { schema: { ...schema, ...relations } })
}

export type Db = ReturnType<typeof createDb>
export type Tx = Parameters<Parameters<Db['transaction']>[0]>[0]
export type Executor = Db | Tx

const globalForDb = globalThis as unknown as { db?: Db }

export function getDb(): Db {
  globalForDb.db ??= createDb()
  return globalForDb.db
}
