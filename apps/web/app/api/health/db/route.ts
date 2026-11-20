import { sql } from 'drizzle-orm'
import { getDb } from '@/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  const started = performance.now()
  try {
    const result = await getDb().execute<{ ok: number }>(sql`select 1 as ok`)
    return Response.json({
      ok: result.rows[0]?.ok === 1,
      latencyMs: Math.round(performance.now() - started),
    })
  } catch {
    return Response.json({ ok: false }, { status: 503 })
  }
}
