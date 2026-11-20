import { sql } from 'drizzle-orm'
import { check, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { applications } from './applications'
import { users } from './users'

export const reviewDecision = pgEnum('review_decision', ['approved', 'rejected'])

/** One admin decision per application; decisions are final, so application_id is unique. */
export const applicationReviews = pgTable(
  'application_reviews',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    applicationId: uuid('application_id')
      .notNull()
      .unique()
      .references(() => applications.id, { onDelete: 'cascade' }),
    /** Nullable so the audit row survives if the admin's user record is deleted. */
    reviewerId: uuid('reviewer_id').references(() => users.id, { onDelete: 'set null' }),
    decision: reviewDecision('decision').notNull(),
    rejectionReason: text('rejection_reason'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check(
      'application_reviews_rejection_reason_check',
      // Explicit IS NOT NULL: length(trim(NULL)) is NULL, and a CHECK that evaluates to NULL passes.
      sql`(${table.decision} = 'rejected' and ${table.rejectionReason} is not null and length(trim(${table.rejectionReason})) > 0)
        or (${table.decision} = 'approved' and ${table.rejectionReason} is null)`,
    ),
  ],
)

export type ApplicationReview = typeof applicationReviews.$inferSelect
export type ReviewDecision = (typeof reviewDecision.enumValues)[number]
