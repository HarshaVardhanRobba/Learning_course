import { pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core'
import { enrollments } from './enrollments'
import { users } from './users'

/**
 * Whether a badge the learner hasn't earned yet may be previewed. `visible` badges appear as locked
 * previews with how to earn them; `hidden` badges stay secret until awarded.
 */
export const badgeVisibility = pgEnum('badge_visibility', ['visible', 'hidden'])

/** In-app badges only: no public verification, certificates or external credentials. */
export const badges = pgTable('badges', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull().unique(),
  title: text('title').notNull(),
  description: text('description').notNull().default(''),
  /** Shown on locked previews. */
  howToEarn: text('how_to_earn').notNull().default(''),
  /** Iconify icon name, e.g. "solar:medal-ribbon-star-linear". */
  icon: text('icon').notNull(),
  visibility: badgeVisibility('visibility').notNull().default('visible'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

/**
 * An award, always tied to the enrollment attempt that earned it. Unique per (learner, badge, attempt):
 * the same attempt can never earn a badge twice, while a later attempt (or another track) earns its own
 * award, so history is preserved across attempts. Rows are written only by server-side progression.
 */
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
    enrollmentId: uuid('enrollment_id')
      .notNull()
      .references(() => enrollments.id, { onDelete: 'cascade' }),
    earnedAt: timestamp('earned_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('user_badges_user_badge_attempt_unique').on(table.userId, table.badgeId, table.enrollmentId)],
)

export type Badge = typeof badges.$inferSelect
export type BadgeVisibility = (typeof badgeVisibility.enumValues)[number]
export type UserBadge = typeof userBadges.$inferSelect
