import 'server-only'
import { asc, desc, eq } from 'drizzle-orm'
import {
  badges,
  courses,
  courseVersions,
  enrollments,
  getDb,
  streams,
  userBadges,
  type CourseKind,
  type EnrollmentStatus,
} from '@workspace/db'

export type BadgeInfo = { id: string; slug: string; title: string; description: string; howToEarn: string; icon: string }

export type BadgeAward = {
  awardId: string
  badge: BadgeInfo
  earnedAt: Date
  /** The enrollment attempt that earned it, and its course (foundation or a track in a stream). */
  attempt: { number: number; status: EnrollmentStatus; version: number }
  course: { kind: CourseKind; slug: string; title: string; streamTitle: string | null }
}

export type Achievements = {
  awards: BadgeAward[]
  /** Visible badges the learner has never earned. Hidden badges are never previewed. */
  locked: BadgeInfo[]
  stats: { awards: number; distinctEarned: number; available: number }
}

/**
 * Badges awarded to one learner. Pass the session-resolved user id only: every row is filtered by it, so
 * a learner can never see another learner's awards. Awards are written only by server-side progression
 * (quiz and assessment passes); nothing here or in any procedure lets a client create one.
 */
export async function getAchievements(userId: string): Promise<Achievements> {
  const db = getDb()
  const [rows, allBadges] = await Promise.all([
    db
      .select({
        awardId: userBadges.id,
        earnedAt: userBadges.earnedAt,
        badge: {
          id: badges.id,
          slug: badges.slug,
          title: badges.title,
          description: badges.description,
          howToEarn: badges.howToEarn,
          icon: badges.icon,
        },
        attemptNumber: enrollments.attemptNumber,
        attemptStatus: enrollments.status,
        version: courseVersions.version,
        courseKind: courses.kind,
        courseSlug: courses.slug,
        courseTitle: courseVersions.title,
        streamTitle: streams.title,
      })
      .from(userBadges)
      .innerJoin(badges, eq(badges.id, userBadges.badgeId))
      .innerJoin(enrollments, eq(enrollments.id, userBadges.enrollmentId))
      .innerJoin(courseVersions, eq(courseVersions.id, enrollments.courseVersionId))
      .innerJoin(courses, eq(courses.id, enrollments.courseId))
      .leftJoin(streams, eq(streams.id, courses.streamId))
      .where(eq(userBadges.userId, userId))
      .orderBy(desc(userBadges.earnedAt)),
    db.select().from(badges).orderBy(asc(badges.createdAt)),
  ])

  const awards: BadgeAward[] = rows.map((r) => ({
    awardId: r.awardId,
    badge: r.badge,
    earnedAt: r.earnedAt,
    attempt: { number: r.attemptNumber, status: r.attemptStatus, version: r.version },
    course: { kind: r.courseKind, slug: r.courseSlug, title: r.courseTitle, streamTitle: r.streamTitle },
  }))

  const earnedIds = new Set(awards.map((a) => a.badge.id))
  const locked = allBadges
    .filter((b) => b.visibility === 'visible' && !earnedIds.has(b.id))
    .map(({ id, slug, title, description, howToEarn, icon }) => ({ id, slug, title, description, howToEarn, icon }))

  return {
    awards,
    locked,
    stats: {
      awards: awards.length,
      distinctEarned: earnedIds.size,
      available: allBadges.filter((b) => b.visibility === 'visible' || earnedIds.has(b.id)).length,
    },
  }
}
