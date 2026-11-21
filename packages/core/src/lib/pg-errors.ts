const UNIQUE_VIOLATION = '23505'

/** Drizzle wraps driver errors, so the Postgres code can sit on the error or on its cause. */
export function isUniqueViolation(error: unknown): boolean {
  const err = error as { code?: string; cause?: { code?: string } }
  return err?.code === UNIQUE_VIOLATION || err?.cause?.code === UNIQUE_VIOLATION
}
