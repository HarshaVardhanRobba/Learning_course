import { pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core'
import { enrollments } from './enrollments'
import { users } from './users'

export const badges = pgTable('badges', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull().unique(),
  title: text('title').notNull(),
  description: text('description').notNull().default(''),
  /** Iconify icon name, e.g. "solar:medal-ribbon-star-linear". */
  icon: text('icon').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const userBadges = pgTable(
  'user_badges',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    badgeId: uuid('badge_id')
      .notNull()
      .references(() => badges.id, { onDelete: 'cascade' }),
    /** The attempt that earned it, when the badge is tied to course work. */
    enrollmentId: uuid('enrollment_id').references(() => enrollments.id, { onDelete: 'set null' }),
    earnedAt: timestamp('earned_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('user_badges_user_badge_unique').on(table.userId, table.badgeId)],
)

export type Badge = typeof badges.$inferSelect
export type UserBadge = typeof userBadges.$inferSelect
