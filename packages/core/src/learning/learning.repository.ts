import 'server-only'
import { and, asc, desc, eq, inArray } from 'drizzle-orm'
import {
  badges,
  courses,
  courseVersions,
  enrollments,
  getDb,
  phases,
  topicCompletions,
  topics,
  userBadges,
  type Badge,
  type CourseKind,
  type Enrollment,
  type Executor,
} from '@workspace/db'

export type PublishedCourse = {
  courseId: string
  slug: string
  kind: CourseKind
  sortOrder: number
  versionId: string
  version: number
  title: string
  summary: string
}

/** The highest published version of every course. Draft and archived versions are never returned. */
export async function findPublishedCourses(executor: Executor = getDb()): Promise<PublishedCourse[]> {
  return executor
    .selectDistinctOn([courses.sortOrder, courses.id], {
      courseId: courses.id,
      slug: courses.slug,
      kind: courses.kind,
      sortOrder: courses.sortOrder,
      versionId: courseVersions.id,
      version: courseVersions.version,
      title: courseVersions.title,
      summary: courseVersions.summary,
    })
    .from(courses)
    .innerJoin(courseVersions, eq(courseVersions.courseId, courses.id))
    .where(eq(courseVersions.status, 'published'))
    .orderBy(asc(courses.sortOrder), asc(courses.id), desc(courseVersions.version))
}

export async function findPublishedCourseById(courseId: string, executor: Executor = getDb()) {
  const [row] = await executor
    .select({ courseId: courses.id, kind: courses.kind, versionId: courseVersions.id })
    .from(courses)
    .innerJoin(courseVersions, eq(courseVersions.courseId, courses.id))
    .where(and(eq(courses.id, courseId), eq(courseVersions.status, 'published')))
    .orderBy(desc(courseVersions.version))
    .limit(1)
  return row ?? null
}

export type EnrollmentWithVersion = Enrollment & { versionTitle: string; version: number }

/** Pass the id of the session-resolved user only. */
export async function findEnrollmentsByUserId(
  userId: string,
  executor: Executor = getDb(),
): Promise<EnrollmentWithVersion[]> {
  const rows = await executor
    .select({ enrollment: enrollments, versionTitle: courseVersions.title, version: courseVersions.version })
    .from(enrollments)
    .innerJoin(courseVersions, eq(courseVersions.id, enrollments.courseVersionId))
    .where(eq(enrollments.userId, userId))
    .orderBy(desc(enrollments.startedAt))
  return rows.map((r) => ({ ...r.enrollment, versionTitle: r.versionTitle, version: r.version }))
}

export type TopicOutline = { topicId: string; topicTitle: string; phaseId: string; phaseTitle: string; versionId: string }

/** Topics of the given versions in learning order (phase position, then topic position). */
export async function findTopicOutlines(versionIds: string[], executor: Executor = getDb()): Promise<TopicOutline[]> {
  if (!versionIds.length) return []
  return executor
    .select({
      topicId: topics.id,
      topicTitle: topics.title,
      phaseId: phases.id,
      phaseTitle: phases.title,
      versionId: phases.courseVersionId,
    })
    .from(topics)
    .innerJoin(phases, eq(phases.id, topics.phaseId))
    .where(inArray(phases.courseVersionId, versionIds))
    .orderBy(asc(phases.position), asc(topics.position))
}

/**
 * Completed topic ids per attempt. The join on topics -> phases -> the attempt's own version means a
 * completion row pointing at another version's topic is never counted.
 */
export async function findCompletedTopicIdsByUserId(
  userId: string,
  executor: Executor = getDb(),
): Promise<{ enrollmentId: string; topicId: string }[]> {
  return executor
    .select({ enrollmentId: topicCompletions.enrollmentId, topicId: topicCompletions.topicId })
    .from(topicCompletions)
    .innerJoin(enrollments, eq(enrollments.id, topicCompletions.enrollmentId))
    .innerJoin(topics, eq(topics.id, topicCompletions.topicId))
    .innerJoin(phases, and(eq(phases.id, topics.phaseId), eq(phases.courseVersionId, enrollments.courseVersionId)))
    .where(eq(enrollments.userId, userId))
}

export type EarnedBadge = Pick<Badge, 'id' | 'slug' | 'title' | 'description' | 'icon'> & { earnedAt: Date }

export async function findRecentBadgesByUserId(
  userId: string,
  limit: number,
  executor: Executor = getDb(),
): Promise<EarnedBadge[]> {
  return executor
    .select({
      id: badges.id,
      slug: badges.slug,
      title: badges.title,
      description: badges.description,
      icon: badges.icon,
      earnedAt: userBadges.earnedAt,
    })
    .from(userBadges)
    .innerJoin(badges, eq(badges.id, userBadges.badgeId))
    .where(eq(userBadges.userId, userId))
    .orderBy(desc(userBadges.earnedAt))
    .limit(limit)
}
