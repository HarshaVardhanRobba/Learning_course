import { pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { users } from './users'

export const applicationStatus = pgEnum('application_status', ['pending', 'approved', 'rejected'])

export const applications = pgTable('applications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: 'cascade' }),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  /** Snapshot of the applicant's primary Clerk email at submission time. */
  email: text('email').notNull(),
  /** Normalized to E.164 (e.g. +919876543210). */
  phone: text('phone').notNull(),
  /** Current state; the admin decision behind a non-pending status lives in application_reviews. */
  status: applicationStatus('status').notNull().default('pending'),
  submittedAt: timestamp('submitted_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
})

export type Application = typeof applications.$inferSelect
export type NewApplication = typeof applications.$inferInsert
export type ApplicationStatus = (typeof applicationStatus.enumValues)[number]
