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
  type PublishedCourse,
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

export type DashboardStream = {
  id: string
  slug: string
  title: string
  summary: string
  tracks: DashboardCourse[]
}

export type LearnerDashboard = {
  foundation: DashboardCourse | null
  foundationComplete: boolean
  /** Every stream with at least one published track, in display order. */
  streams: DashboardStream[]
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

/**
 * True when any of the learner's foundation attempts has every topic completed. This is the gate for
 * every track: starting one, viewing its map, and recording progress in it.
 */
export async function hasCompletedFoundation(userId: string, executor: Executor = getDb()): Promise<boolean> {
  const published = await findPublishedCourses(executor)
  const foundation = published.find((c) => c.kind === 'foundation')
  if (!foundation) return false
  const attempts = await loadAttempts(userId, executor)
  return attempts.some((a) => a.courseId === foundation.courseId && a.isComplete)
}

function statusOf(attempts: AttemptProgress[]): LearningStatus {
  if (attempts.some((a) => a.isComplete)) return 'completed'
  return attempts.some((a) => a.status === 'in_progress') ? 'in_progress' : 'not_started'
}

/** Tracks without a stream are not shown. Courses arrive sorted, so stream order follows the first track. */
function groupByStream(tracks: PublishedCourse[], toCard: (course: PublishedCourse) => DashboardCourse): DashboardStream[] {
  const byId = new Map<string, DashboardStream>()
  for (const track of tracks) {
    if (!track.stream) continue
    const stream = byId.get(track.stream.id) ?? { ...track.stream, tracks: [] }
    stream.tracks.push(toCard(track))
    byId.set(track.stream.id, stream)
  }
  return [...byId.values()]
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

  const toCard = (course: PublishedCourse): DashboardCourse => {
    const courseAttempts = attemptsByCourse.get(course.courseId) ?? []
    const live = courseAttempts.find((a) => a.status === 'in_progress') ?? null
    const locked = course.kind === 'track' && !foundationComplete
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
    streams: groupByStream(published.filter((c) => c.kind === 'track'), toCard),
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
      // Tracks outside a stream are hidden from the dashboard, so they cannot be started either.
      if (!course || (course.kind === 'track' && !course.streamId)) return { ok: false, reason: 'not_found' } as const

      if (course.kind === 'track' && !(await hasCompletedFoundation(userId, tx))) {
        return { ok: false, reason: 'locked' } as const
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
