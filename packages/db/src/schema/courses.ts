import { sql } from 'drizzle-orm'
import { integer, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core'

/** `foundation` is the common course every learner finishes before any career path unlocks. */
export const courseKind = pgEnum('course_kind', ['foundation', 'career_path'])

/** Only `published` versions are shown to learners. `archived` versions stop taking new attempts but keep existing ones readable. */
export const courseVersionStatus = pgEnum('course_version_status', ['draft', 'published', 'archived'])

export const courses = pgTable(
  'courses',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slug: text('slug').notNull().unique(),
    kind: courseKind('kind').notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  // Exactly one foundation course: career-path unlocking depends on it.
  (table) => [uniqueIndex('courses_single_foundation').on(table.kind).where(sql`${table.kind} = 'foundation'`)],
)

/** Content is versioned so an attempt keeps measuring progress against the version it started on. */
export const courseVersions = pgTable(
  'course_versions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    courseId: uuid('course_id')
      .notNull()
      .references(() => courses.id, { onDelete: 'cascade' }),
    version: integer('version').notNull(),
    status: courseVersionStatus('status').notNull().default('draft'),
    title: text('title').notNull(),
    summary: text('summary').notNull().default(''),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex('course_versions_course_version_unique').on(table.courseId, table.version)],
)

export const phases = pgTable(
  'phases',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    courseVersionId: uuid('course_version_id')
      .notNull()
      .references(() => courseVersions.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
    title: text('title').notNull(),
  },
  (table) => [uniqueIndex('phases_version_position_unique').on(table.courseVersionId, table.position)],
)

export const topics = pgTable(
  'topics',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    phaseId: uuid('phase_id')
      .notNull()
      .references(() => phases.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
    title: text('title').notNull(),
  },
  (table) => [uniqueIndex('topics_phase_position_unique').on(table.phaseId, table.position)],
)

export type Course = typeof courses.$inferSelect
export type CourseKind = (typeof courseKind.enumValues)[number]
export type CourseVersion = typeof courseVersions.$inferSelect
export type CourseVersionStatus = (typeof courseVersionStatus.enumValues)[number]
export type Phase = typeof phases.$inferSelect
export type Topic = typeof topics.$inferSelect
