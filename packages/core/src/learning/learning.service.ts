import 'server-only'
import { and, eq, max } from 'drizzle-orm'
import { enrollments, getDb, type CourseKind, type Executor } from '@workspace/db'
import { findApplicationByUserId } from '../applications/application.repository'
import { isUniqueViolation } from '../lib/pg-errors'
import {
  findCompletedTopicIdsByUserId,
  findEnrollmentsByUserId,
  findPublishedCourseById,
  findPublishedCourses,
  findRecentBadgesByUserId,
  findTopicOutlines,
  type EarnedBadge,
} from './learning.repository'
import { computeAttemptProgress, groupCompletions, type AttemptProgress } from './progress'

export type LearningStatus = 'not_started' | 'in_progress' | 'completed'

export type DashboardCourse = {
  courseId: string
  slug: string
  kind: CourseKind
  title: string
  summary: string
  /** Version a new attempt would start on. */
  version: number
  /** The live attempt, or the most recent one when none is live. */
  currentAttempt: AttemptProgress | null
  /** Every attempt for this course, newest first. */
  attempts: AttemptProgress[]
  status: LearningStatus
  locked: boolean
  /** Starting is allowed and no attempt is live. */
  canStart: boolean
  /** A live attempt exists and may be replaced by a fresh one (the old one is kept as abandoned). */
  canRestart: boolean
}

export type HistoryEvent = {
  id: string
  kind: 'started' | 'completed' | 'abandoned'
  at: Date
  courseTitle: string
  attemptNumber: number
}

export type LearnerDashboard = {
  foundation: DashboardCourse | null
  foundationComplete: boolean
  careerPaths: DashboardCourse[]
  recentBadges: EarnedBadge[]
  history: HistoryEvent[]
}

async function loadAttempts(userId: string, executor: Executor) {
  const [enrollmentRows, completionRows] = await Promise.all([
    findEnrollmentsByUserId(userId, executor),
    findCompletedTopicIdsByUserId(userId, executor),
  ])
  const outlines = await findTopicOutlines([...new Set(enrollmentRows.map((e) => e.courseVersionId))], executor)
  const completions = groupCompletions(completionRows)
  return enrollmentRows.map((e) => computeAttemptProgress(e, outlines, completions.get(e.id) ?? new Set()))
}

function statusOf(attempts: AttemptProgress[]): LearningStatus {
  if (attempts.some((a) => a.isComplete)) return 'completed'
  return attempts.some((a) => a.status === 'in_progress') ? 'in_progress' : 'not_started'
}

/** Everything the dashboard shows, scoped to one learner. Pass the session-resolved user id only. */
export async function getLearnerDashboard(userId: string): Promise<LearnerDashboard> {
  const db = getDb()
  const [published, attempts, recentBadges] = await Promise.all([
    findPublishedCourses(db),
    loadAttempts(userId, db),
    findRecentBadgesByUserId(userId, 4, db),
  ])

  const attemptsByCourse = new Map<string, AttemptProgress[]>()
  for (const attempt of attempts) {
    const list = attemptsByCourse.get(attempt.courseId) ?? []
    list.push(attempt)
    attemptsByCourse.set(attempt.courseId, list)
  }

  const foundationCourse = published.find((c) => c.kind === 'foundation')
  const foundationComplete = foundationCourse
    ? (attemptsByCourse.get(foundationCourse.courseId) ?? []).some((a) => a.isComplete)
    : false

  const toCard = (course: (typeof published)[number]): DashboardCourse => {
    const courseAttempts = attemptsByCourse.get(course.courseId) ?? []
    const live = courseAttempts.find((a) => a.status === 'in_progress') ?? null
    const locked = course.kind === 'career_path' && !foundationComplete
    return {
      courseId: course.courseId,
      slug: course.slug,
      kind: course.kind,
      title: course.title,
      summary: course.summary,
      version: course.version,
      currentAttempt: live ?? courseAttempts[0] ?? null,
      attempts: courseAttempts,
      status: statusOf(courseAttempts),
      locked,
      canStart: !locked && !live,
      canRestart: !locked && !!live,
    }
  }

  const history: HistoryEvent[] = attempts
    .flatMap((a) => {
      const base = { courseTitle: a.versionTitle, attemptNumber: a.attemptNumber }
      const events: HistoryEvent[] = [{ ...base, id: `${a.enrollmentId}:started`, kind: 'started', at: a.startedAt }]
      if (a.endedAt && a.status !== 'in_progress') {
        events.push({ ...base, id: `${a.enrollmentId}:${a.status}`, kind: a.status, at: a.endedAt })
      }
      return events
    })
    .sort((x, y) => y.at.getTime() - x.at.getTime())
    .slice(0, 5)

  return {
    foundation: foundationCourse ? toCard(foundationCourse) : null,
    foundationComplete,
    careerPaths: published.filter((c) => c.kind === 'career_path').map(toCard),
    recentBadges,
    history,
  }
}

export type StartAttemptResult =
  | { ok: true; enrollmentId: string }
  | { ok: false; reason: 'not_approved' | 'not_found' | 'locked' | 'in_progress' | 'conflict' }

/**
 * Starts a new attempt on the course's latest published version. With `replaceInProgress`, the live
 * attempt is marked abandoned first; it and its completions are kept. All checks run server-side.
 */
export async function startAttempt(params: {
  userId: string
  courseId: string
  replaceInProgress: boolean
}): Promise<StartAttemptResult> {
  const { userId, courseId, replaceInProgress } = params
  try {
    return await getDb().transaction(async (tx) => {
      const application = await findApplicationByUserId(userId, tx)
      if (application?.status !== 'approved') return { ok: false, reason: 'not_approved' } as const

      const course = await findPublishedCourseById(courseId, tx)
      if (!course) return { ok: false, reason: 'not_found' } as const

      if (course.kind === 'career_path') {
        const published = await findPublishedCourses(tx)
        const foundation = published.find((c) => c.kind === 'foundation')
        const attempts = foundation ? await loadAttempts(userId, tx) : []
        const done = attempts.some((a) => a.courseId === foundation?.courseId && a.isComplete)
        if (!done) return { ok: false, reason: 'locked' } as const
      }

      const live = and(
        eq(enrollments.userId, userId),
        eq(enrollments.courseId, courseId),
        eq(enrollments.status, 'in_progress'),
      )
      if (replaceInProgress) {
        await tx.update(enrollments).set({ status: 'abandoned', endedAt: new Date() }).where(live)
      } else {
        const [existing] = await tx.select({ id: enrollments.id }).from(enrollments).where(live).limit(1)
        if (existing) return { ok: false, reason: 'in_progress' } as const
      }

      const [last] = await tx
        .select({ n: max(enrollments.attemptNumber) })
        .from(enrollments)
        .where(and(eq(enrollments.userId, userId), eq(enrollments.courseId, courseId)))

      const [created] = await tx
        .insert(enrollments)
        .values({ userId, courseId, courseVersionId: course.versionId, attemptNumber: (last?.n ?? 0) + 1 })
        .returning({ id: enrollments.id })
      return { ok: true, enrollmentId: created!.id } as const
    })
  } catch (error) {
    // Two concurrent starts both pass the checks; the unique indexes on attempts reject the second.
    if (isUniqueViolation(error)) return { ok: false, reason: 'conflict' }
    throw error
  }
}
