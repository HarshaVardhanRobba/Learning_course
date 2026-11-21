/**
 * Imports the Common Foundation, streams, and tracks from data/learning-tracks.json (exported from
 * TMT_Self_Learning_Tracks.xlsx), plus badge definitions. Run with `npm run db:seed`.
 *
 * Safe to re-run:
 * - A course whose content is unchanged is skipped.
 * - Changed content on a version nobody has started is updated in place.
 * - Changed content on a version with attempts becomes a new published version and the older one is
 *   archived, so existing attempts keep measuring progress against the version they started on.
 * - Courses and badges no longer in the data are deleted when nothing references them, otherwise
 *   archived (courses) or left in place (badges).
 */
import { readFileSync } from 'node:fs'
import { config } from 'dotenv'
import { Pool } from '@neondatabase/serverless'
import { and, asc, desc, eq, inArray, max, notInArray } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/neon-serverless'
import * as schema from './schema'
import type { CourseKind } from './schema'

config({ path: '../../apps/web/.env.local' })

type SheetQuizQuestion =
  | { kind: 'mcq'; prompt: string; options: string[]; correct: number; explanation?: string }
  | { kind: 'fill_blank'; prompt: string; answers: string[]; explanation?: string }
type SheetQuiz = { title?: string; instructions?: string; questions: SheetQuizQuestion[] }
/** `quiz` is optional: topics without one get a generated starter quiz (see starterQuiz). */
type SheetTopic = { title: string; description: string; lessons: string[]; quiz?: SheetQuiz }
type SheetCourse = { slug: string; title: string; topics: SheetTopic[] }
type SheetData = { foundation: SheetCourse; streams: { slug: string; title: string; tracks: SheetCourse[] }[] }

type PhaseSpec = { title: string; topics: SheetTopic[] }
type CourseSpec = {
  slug: string
  kind: CourseKind
  streamSlug: string | null
  sortOrder: number
  title: string
  summary: string
  phases: PhaseSpec[]
}

const FOUNDATION_WAYS_OF_WORKING = new Set(['AI-assisted work', 'How teams work', 'Professional skills'])

/** The sheet lists topics only; phases group them so progress can be reported per phase. */
function foundationPhases(topics: SheetTopic[]): PhaseSpec[] {
  return [
    { title: 'Technical foundations', topics: topics.filter((t) => !FOUNDATION_WAYS_OF_WORKING.has(t.title)) },
    { title: 'Ways of working', topics: topics.filter((t) => FOUNDATION_WAYS_OF_WORKING.has(t.title)) },
  ].filter((p) => p.topics.length)
}

function trackPhases(topics: SheetTopic[]): PhaseSpec[] {
  const isCapstone = (t: SheetTopic) => t.title === 'Capstone project'
  const isAi = (t: SheetTopic) => t.title.startsWith('AI ')
  return [
    { title: 'Core skills', topics: topics.filter((t) => !isAi(t) && !isCapstone(t)) },
    { title: 'AI for this role', topics: topics.filter(isAi) },
    { title: 'Capstone', topics: topics.filter(isCapstone) },
  ].filter((p) => p.topics.length)
}

/** The sheet has no track descriptions, so one is derived: the capstone if present, else the skills covered. */
function trackSummary(topics: SheetTopic[]): string {
  const capstone = topics.find((t) => t.title === 'Capstone project')
  if (capstone?.description) return `Capstone: ${capstone.description}`
  const skills = topics.filter((t) => !t.title.startsWith('AI ')).map((t) => t.title)
  return `Covers ${skills.join(', ')}.`
}

function loadSpecs() {
  const data = JSON.parse(readFileSync(new URL('../data/learning-tracks.json', import.meta.url), 'utf8')) as SheetData
  const streams = data.streams.map((s, i) => ({ slug: s.slug, title: s.title, sortOrder: (i + 1) * 10 }))
  const courses: CourseSpec[] = [
    {
      slug: data.foundation.slug,
      kind: 'foundation',
      streamSlug: null,
      sortOrder: 0,
      title: data.foundation.title,
      summary: 'The shared groundwork every learner completes before choosing a stream.',
      phases: foundationPhases(data.foundation.topics),
    },
    ...data.streams.flatMap((s, si) =>
      s.tracks.map((t, ti) => ({
        slug: t.slug,
        kind: 'track' as const,
        streamSlug: s.slug,
        sortOrder: (si + 1) * 100 + ti,
        title: t.title,
        summary: trackSummary(t.topics),
        phases: trackPhases(t.topics),
      })),
    ),
  ]
  return { streams, courses }
}

const BADGES: {
  slug: string
  title: string
  description: string
  howToEarn: string
  icon: string
  visibility: 'visible' | 'hidden'
}[] = [
  {
    slug: 'first-topic',
    title: 'First step',
    description: 'Passed your first topic quiz in a course.',
    howToEarn: 'Pass any topic quiz with 100%.',
    icon: 'solar:star-linear',
    visibility: 'visible',
  },
  {
    slug: 'first-phase',
    title: 'Phase cleared',
    description: 'Completed a full phase by passing its assessment.',
    howToEarn: 'Pass every topic quiz in a phase, then its phase assessment with 100%.',
    icon: 'solar:flag-linear',
    visibility: 'visible',
  },
  {
    slug: 'foundation-complete',
    title: 'Foundation complete',
    description: 'Finished the Common Foundation and unlocked every stream.',
    howToEarn: 'Complete every phase of the Common Foundation.',
    icon: 'solar:medal-ribbon-star-linear',
    visibility: 'visible',
  },
  {
    slug: 'track-complete',
    title: 'Path finisher',
    description: 'Completed a track in one of the streams.',
    howToEarn: 'Complete every phase of any track.',
    icon: 'solar:cup-star-linear',
    visibility: 'visible',
  },
]

type Db = ReturnType<typeof drizzle<typeof schema>>
type Tx = Parameters<Parameters<Db['transaction']>[0]>[0]

/** Canonical form of a version's content, used to decide whether a new version is needed. */
function fingerprint(title: string, summary: string, phases: PhaseSpec[]) {
  return JSON.stringify({
    title,
    summary,
    phases: phases.map((p) => [p.title, p.topics.map((t) => [t.title, t.description, t.lessons])]),
  })
}

async function latestPublished(tx: Tx, courseId: string) {
  const [version] = await tx
    .select()
    .from(schema.courseVersions)
    .where(and(eq(schema.courseVersions.courseId, courseId), eq(schema.courseVersions.status, 'published')))
    .orderBy(desc(schema.courseVersions.version))
    .limit(1)
  if (!version) return null

  const rows = await tx
    .select({
      phaseId: schema.phases.id,
      phaseTitle: schema.phases.title,
      topicId: schema.topics.id,
      title: schema.topics.title,
      description: schema.topics.description,
      lesson: schema.lessons.title,
    })
    .from(schema.phases)
    .innerJoin(schema.topics, eq(schema.topics.phaseId, schema.phases.id))
    .leftJoin(schema.lessons, eq(schema.lessons.topicId, schema.topics.id))
    .where(eq(schema.phases.courseVersionId, version.id))
    .orderBy(asc(schema.phases.position), asc(schema.topics.position), asc(schema.lessons.position))

  const phases: (PhaseSpec & { id: string })[] = []
  let topicId: string | undefined
  for (const row of rows) {
    let phase = phases.at(-1)
    if (phase?.id !== row.phaseId) {
      phase = { id: row.phaseId, title: row.phaseTitle, topics: [] }
      phases.push(phase)
    }
    if (topicId !== row.topicId) {
      topicId = row.topicId
      phase.topics.push({ title: row.title, description: row.description, lessons: [] })
    }
    if (row.lesson) phase.topics.at(-1)!.lessons.push(row.lesson)
  }

  const [attempt] = await tx
    .select({ id: schema.enrollments.id })
    .from(schema.enrollments)
    .where(eq(schema.enrollments.courseVersionId, version.id))
    .limit(1)

  return {
    version,
    hasAttempts: !!attempt,
    fingerprint: fingerprint(version.title, version.summary, phases.map(({ title, topics }) => ({ title, topics }))),
  }
}

async function insertContent(tx: Tx, versionId: string, phases: PhaseSpec[]) {
  for (const [phaseIndex, phase] of phases.entries()) {
    const [phaseRow] = await tx
      .insert(schema.phases)
      .values({ courseVersionId: versionId, position: phaseIndex + 1, title: phase.title })
      .returning()
    const topicRows = await tx
      .insert(schema.topics)
      .values(phase.topics.map((t, i) => ({ phaseId: phaseRow!.id, position: i + 1, title: t.title, description: t.description })))
      .returning()
    const lessonValues = topicRows.flatMap((topic, i) =>
      phase.topics[i]!.lessons.map((title, li) => ({ topicId: topic.id, position: li + 1, title })),
    )
    if (lessonValues.length) await tx.insert(schema.lessons).values(lessonValues)
  }
}

/** Small deterministic hash so generated option order is stable across runs. */
function hash(text: string): number {
  let h = 0
  for (const ch of text) h = (h * 31 + ch.codePointAt(0)!) >>> 0
  return h
}

function rotate<T>(items: T[], by: number): T[] {
  const n = by % items.length
  return [...items.slice(n), ...items.slice(0, n)]
}

/**
 * Placeholder quiz built from the course's own content until real questions are written in the JSON:
 * two multiple-choice questions and one fill-in-the-blank. Replace by adding `quiz` to a topic.
 */
function starterQuiz(topic: SheetTopic, courseTopics: SheetTopic[]): SheetQuiz {
  const others = courseTopics.filter((t) => t !== topic)
  const index = courseTopics.indexOf(topic)
  const nextOthers = rotate(others, Math.max(index, 0)).slice(0, 3)

  const lessonA = topic.lessons[0] ?? topic.title
  const lessonB = topic.lessons[1] ?? lessonA
  const distractorLessons = nextOthers.map((t) => t.lessons[0] ?? t.title)

  const mcq = (prompt: string, correct: string, wrong: string[], explanation: string): SheetQuizQuestion => {
    const options = rotate([correct, ...wrong], hash(prompt) % (wrong.length + 1))
    return { kind: 'mcq', prompt, options, correct: options.indexOf(correct), explanation }
  }

  const words = topic.title.split(' ')
  const fill: SheetQuizQuestion =
    words.length > 1
      ? {
          kind: 'fill_blank',
          prompt: `Complete the topic name: “${words.slice(0, -1).join(' ')} ____”`,
          answers: [words.at(-1)!],
          explanation: `The topic is “${topic.title}”.`,
        }
      : {
          kind: 'fill_blank',
          prompt: `The topic that covers “${lessonA}” is called ____.`,
          answers: [topic.title],
          explanation: `“${lessonA}” is part of “${topic.title}”.`,
        }

  return {
    title: `${topic.title} quiz`,
    instructions: 'Answer each question. You need every answer right (100%) to pass. You can retry as many times as you like.',
    questions: [
      mcq(`Which of these is covered in “${topic.title}”?`, lessonA, distractorLessons, `“${lessonA}” is one of this topic’s lessons.`),
      mcq(`“${lessonB}” belongs to which topic?`, topic.title, nextOthers.map((t) => t.title), `“${lessonB}” is covered in “${topic.title}”.`),
      fill,
    ],
  }
}

/**
 * Adds a quiz to every topic of the latest published version that has none yet. Additive only: an existing
 * quiz is never replaced, because learners' quiz attempts reference its questions.
 */
async function syncQuizzes(tx: Tx, spec: CourseSpec): Promise<number> {
  const [course] = await tx.select({ id: schema.courses.id }).from(schema.courses).where(eq(schema.courses.slug, spec.slug))
  if (!course) return 0
  const [version] = await tx
    .select({ id: schema.courseVersions.id })
    .from(schema.courseVersions)
    .where(and(eq(schema.courseVersions.courseId, course.id), eq(schema.courseVersions.status, 'published')))
    .orderBy(desc(schema.courseVersions.version))
    .limit(1)
  if (!version) return 0

  const dbTopics = await tx
    .select({ id: schema.topics.id, title: schema.topics.title, quizId: schema.topicQuizzes.id })
    .from(schema.topics)
    .innerJoin(schema.phases, eq(schema.phases.id, schema.topics.phaseId))
    .leftJoin(schema.topicQuizzes, eq(schema.topicQuizzes.topicId, schema.topics.id))
    .where(eq(schema.phases.courseVersionId, version.id))
    .orderBy(asc(schema.phases.position), asc(schema.topics.position))

  const specTopics = spec.phases.flatMap((p) => p.topics)
  let added = 0
  for (const [i, row] of dbTopics.entries()) {
    const topic = specTopics[i]
    if (row.quizId || !topic || topic.title !== row.title) continue
    const quiz = topic.quiz ?? starterQuiz(topic, specTopics)

    const [quizRow] = await tx
      .insert(schema.topicQuizzes)
      .values({ topicId: row.id, title: quiz.title ?? `${topic.title} quiz`, instructions: quiz.instructions ?? '' })
      .returning()
    for (const [qi, q] of quiz.questions.entries()) {
      const [questionRow] = await tx
        .insert(schema.quizQuestions)
        .values({
          quizId: quizRow!.id,
          position: qi + 1,
          kind: q.kind,
          prompt: q.prompt,
          acceptedAnswers: q.kind === 'fill_blank' ? q.answers : [],
          explanation: q.explanation ?? '',
        })
        .returning()
      if (q.kind === 'mcq') {
        if (q.correct < 0 || q.correct >= q.options.length) throw new Error(`Quiz for “${topic.title}”: correct option out of range.`)
        await tx
          .insert(schema.quizOptions)
          .values(q.options.map((label, oi) => ({ questionId: questionRow!.id, position: oi + 1, label, isCorrect: oi === q.correct })))
      }
    }
    added += 1
  }
  return added
}

/**
 * Placeholder phase assessment from the phase's own topics: one question per topic (alternating
 * multiple choice and fill-in-the-blank, reusing the starter quiz questions), at most 10.
 */
function starterAssessment(phase: PhaseSpec, courseTopics: SheetTopic[]): SheetQuiz {
  const questions = phase.topics.slice(0, 10).map((topic, i) => {
    const quiz = starterQuiz(topic, courseTopics)
    return quiz.questions[i % 2 === 0 ? 1 : 2]!
  })
  return {
    title: `${phase.title} assessment`,
    instructions:
      'This covers every topic in the phase. Answer all questions, review your answers, then submit. 100% is required to pass and complete the phase; retries are unlimited.',
    questions,
  }
}

/** Adds an assessment to every phase of the latest published version that has none. Additive only. */
async function syncAssessments(tx: Tx, spec: CourseSpec): Promise<number> {
  const [course] = await tx.select({ id: schema.courses.id }).from(schema.courses).where(eq(schema.courses.slug, spec.slug))
  if (!course) return 0
  const [version] = await tx
    .select({ id: schema.courseVersions.id })
    .from(schema.courseVersions)
    .where(and(eq(schema.courseVersions.courseId, course.id), eq(schema.courseVersions.status, 'published')))
    .orderBy(desc(schema.courseVersions.version))
    .limit(1)
  if (!version) return 0

  const dbPhases = await tx
    .select({ id: schema.phases.id, title: schema.phases.title, assessmentId: schema.phaseAssessments.id })
    .from(schema.phases)
    .leftJoin(schema.phaseAssessments, eq(schema.phaseAssessments.phaseId, schema.phases.id))
    .where(eq(schema.phases.courseVersionId, version.id))
    .orderBy(asc(schema.phases.position))

  const courseTopics = spec.phases.flatMap((p) => p.topics)
  let added = 0
  for (const [i, row] of dbPhases.entries()) {
    const phase = spec.phases[i]
    if (row.assessmentId || !phase || phase.title !== row.title) continue
    const assessment = starterAssessment(phase, courseTopics)
    const [assessmentRow] = await tx
      .insert(schema.phaseAssessments)
      .values({ phaseId: row.id, title: assessment.title!, instructions: assessment.instructions ?? '' })
      .returning()
    for (const [qi, q] of assessment.questions.entries()) {
      const [questionRow] = await tx
        .insert(schema.assessmentQuestions)
        .values({
          assessmentId: assessmentRow!.id,
          position: qi + 1,
          kind: q.kind,
          prompt: q.prompt,
          acceptedAnswers: q.kind === 'fill_blank' ? q.answers : [],
          explanation: q.explanation ?? '',
        })
        .returning()
      if (q.kind === 'mcq') {
        await tx
          .insert(schema.assessmentOptions)
          .values(q.options.map((label, oi) => ({ questionId: questionRow!.id, position: oi + 1, label, isCorrect: oi === q.correct })))
      }
    }
    added += 1
  }
  return added
}

async function upsertCourse(tx: Tx, spec: CourseSpec, streamIds: Map<string, string>) {
  const values = {
    slug: spec.slug,
    kind: spec.kind,
    streamId: spec.streamSlug ? streamIds.get(spec.streamSlug)! : null,
    sortOrder: spec.sortOrder,
  }
  const [course] = await tx
    .insert(schema.courses)
    .values(values)
    .onConflictDoUpdate({ target: schema.courses.slug, set: { kind: values.kind, streamId: values.streamId, sortOrder: values.sortOrder } })
    .returning()

  const current = await latestPublished(tx, course!.id)
  if (current?.fingerprint === fingerprint(spec.title, spec.summary, spec.phases)) return 'unchanged'

  // Nobody has started this version, so its content can be replaced without affecting any progress.
  if (current && !current.hasAttempts) {
    await tx.delete(schema.phases).where(eq(schema.phases.courseVersionId, current.version.id))
    await tx
      .update(schema.courseVersions)
      .set({ title: spec.title, summary: spec.summary })
      .where(eq(schema.courseVersions.id, current.version.id))
    await insertContent(tx, current.version.id, spec.phases)
    return `updated v${current.version.version} in place`
  }

  const [last] = await tx
    .select({ n: max(schema.courseVersions.version) })
    .from(schema.courseVersions)
    .where(eq(schema.courseVersions.courseId, course!.id))
  const nextVersion = (last?.n ?? 0) + 1

  await tx
    .update(schema.courseVersions)
    .set({ status: 'archived' })
    .where(and(eq(schema.courseVersions.courseId, course!.id), eq(schema.courseVersions.status, 'published')))

  const [version] = await tx
    .insert(schema.courseVersions)
    .values({
      courseId: course!.id,
      version: nextVersion,
      status: 'published',
      title: spec.title,
      summary: spec.summary,
      publishedAt: new Date(),
    })
    .returning()
  await insertContent(tx, version!.id, spec.phases)
  return `published v${nextVersion}`
}

async function pruneCourses(tx: Tx, keepSlugs: string[]) {
  const stale = await tx.select().from(schema.courses).where(notInArray(schema.courses.slug, keepSlugs))
  for (const course of stale) {
    const [used] = await tx
      .select({ id: schema.enrollments.id })
      .from(schema.enrollments)
      .where(eq(schema.enrollments.courseId, course.id))
      .limit(1)
    if (used) {
      await tx
        .update(schema.courseVersions)
        .set({ status: 'archived' })
        .where(and(eq(schema.courseVersions.courseId, course.id), eq(schema.courseVersions.status, 'published')))
      console.log(`archived ${course.slug} (has attempts)`)
    } else {
      await tx.delete(schema.courses).where(eq(schema.courses.id, course.id))
      console.log(`deleted ${course.slug} (unused)`)
    }
  }
}

async function main() {
  const url = process.env.DATABASE_URL_UNPOOLED
  if (!url) throw new Error('DATABASE_URL_UNPOOLED is not set. Run `neon env pull` in apps/web.')
  const pool = new Pool({ connectionString: url })
  const db = drizzle(pool, { schema })
  const specs = loadSpecs()

  try {
    await db.transaction(async (tx) => {
      const streamIds = new Map<string, string>()
      for (const s of specs.streams) {
        const [row] = await tx
          .insert(schema.streams)
          .values(s)
          .onConflictDoUpdate({ target: schema.streams.slug, set: { title: s.title, sortOrder: s.sortOrder } })
          .returning()
        streamIds.set(s.slug, row!.id)
      }

      // Prune first so a renamed course never collides with the single-foundation index.
      await pruneCourses(tx, specs.courses.map((c) => c.slug))
      for (const spec of specs.courses) {
        console.log(`${spec.slug}: ${await upsertCourse(tx, spec, streamIds)}`)
        const added = await syncQuizzes(tx, spec)
        if (added) console.log(`${spec.slug}: added ${added} quizzes`)
        const addedAssessments = await syncAssessments(tx, spec)
        if (addedAssessments) console.log(`${spec.slug}: added ${addedAssessments} phase assessments`)
      }

      const unusedStreams = await tx
        .select({ id: schema.streams.id })
        .from(schema.streams)
        .where(notInArray(schema.streams.slug, specs.streams.map((s) => s.slug)))
      for (const s of unusedStreams) {
        const [ref] = await tx.select({ id: schema.courses.id }).from(schema.courses).where(eq(schema.courses.streamId, s.id)).limit(1)
        if (!ref) await tx.delete(schema.streams).where(eq(schema.streams.id, s.id))
      }

      for (const b of BADGES) {
        await tx
          .insert(schema.badges)
          .values(b)
          .onConflictDoUpdate({
            target: schema.badges.slug,
            set: { title: b.title, description: b.description, howToEarn: b.howToEarn, icon: b.icon, visibility: b.visibility },
          })
      }
      const staleBadges = await tx
        .select({ id: schema.badges.id })
        .from(schema.badges)
        .where(notInArray(schema.badges.slug, BADGES.map((b) => b.slug)))
      const earned = staleBadges.length
        ? await tx
            .select({ badgeId: schema.userBadges.badgeId })
            .from(schema.userBadges)
            .where(inArray(schema.userBadges.badgeId, staleBadges.map((b) => b.id)))
        : []
      const earnedIds = new Set(earned.map((e) => e.badgeId))
      const removable = staleBadges.filter((b) => !earnedIds.has(b.id)).map((b) => b.id)
      if (removable.length) await tx.delete(schema.badges).where(inArray(schema.badges.id, removable))
    })
    console.log('done')
  } finally {
    await pool.end()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
