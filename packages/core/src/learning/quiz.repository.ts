import 'server-only'
import { and, asc, desc, eq, inArray, isNull, max } from 'drizzle-orm'
import {
  courseVersions,
  getDb,
  phases,
  quizAnswers,
  quizAttempts,
  quizOptions,
  quizQuestions,
  topicQuizzes,
  topics,
  type Executor,
  type QuizQuestionKind,
} from '@workspace/db'

export async function findQuizIdByTopic(topicId: string, executor: Executor = getDb()): Promise<string | null> {
  const [row] = await executor.select({ id: topicQuizzes.id }).from(topicQuizzes).where(eq(topicQuizzes.topicId, topicId)).limit(1)
  return row?.id ?? null
}

export async function findQuizIdsByTopics(topicIds: string[], executor: Executor = getDb()): Promise<Map<string, string>> {
  if (!topicIds.length) return new Map()
  const rows = await executor
    .select({ id: topicQuizzes.id, topicId: topicQuizzes.topicId })
    .from(topicQuizzes)
    .where(inArray(topicQuizzes.topicId, topicIds))
  return new Map(rows.map((r) => [r.topicId, r.id]))
}

/** Where a quiz lives: its topic, that topic's course version, and the course. */
export async function findQuizLocation(quizId: string, executor: Executor = getDb()) {
  const [row] = await executor
    .select({
      quizId: topicQuizzes.id,
      title: topicQuizzes.title,
      instructions: topicQuizzes.instructions,
      topicId: topicQuizzes.topicId,
      courseVersionId: phases.courseVersionId,
      courseId: courseVersions.courseId,
    })
    .from(topicQuizzes)
    .innerJoin(topics, eq(topics.id, topicQuizzes.topicId))
    .innerJoin(phases, eq(phases.id, topics.phaseId))
    .innerJoin(courseVersions, eq(courseVersions.id, phases.courseVersionId))
    .where(eq(topicQuizzes.id, quizId))
    .limit(1)
  return row ?? null
}

export type QuestionWithKey = {
  id: string
  position: number
  kind: QuizQuestionKind
  prompt: string
  explanation: string
  acceptedAnswers: string[]
  options: { id: string; label: string; isCorrect: boolean }[]
}

/** Questions with their answer key. Server-only: callers must strip the key before returning to a learner. */
export async function findQuestionsWithKey(quizId: string, executor: Executor = getDb()): Promise<QuestionWithKey[]> {
  const questionRows = await executor
    .select()
    .from(quizQuestions)
    .where(eq(quizQuestions.quizId, quizId))
    .orderBy(asc(quizQuestions.position))
  if (!questionRows.length) return []

  const optionRows = await executor
    .select()
    .from(quizOptions)
    .where(inArray(quizOptions.questionId, questionRows.map((q) => q.id)))
    .orderBy(asc(quizOptions.position))

  return questionRows.map((q) => ({
    id: q.id,
    position: q.position,
    kind: q.kind,
    prompt: q.prompt,
    explanation: q.explanation,
    acceptedAnswers: q.acceptedAnswers,
    options: optionRows.filter((o) => o.questionId === q.id).map((o) => ({ id: o.id, label: o.label, isCorrect: o.isCorrect })),
  }))
}

export async function findQuizAttempts(enrollmentId: string, quizId: string, executor: Executor = getDb()) {
  return executor
    .select()
    .from(quizAttempts)
    .where(and(eq(quizAttempts.enrollmentId, enrollmentId), eq(quizAttempts.quizId, quizId)))
    .orderBy(desc(quizAttempts.attemptNumber))
}

export async function findOpenQuizAttempt(enrollmentId: string, quizId: string, executor: Executor, forUpdate = false) {
  const query = executor
    .select()
    .from(quizAttempts)
    .where(and(eq(quizAttempts.enrollmentId, enrollmentId), eq(quizAttempts.quizId, quizId), isNull(quizAttempts.finishedAt)))
    .limit(1)
  const [row] = forUpdate ? await query.for('update') : await query
  return row ?? null
}

export async function findNextQuizAttemptNumber(enrollmentId: string, quizId: string, executor: Executor): Promise<number> {
  const [row] = await executor
    .select({ n: max(quizAttempts.attemptNumber) })
    .from(quizAttempts)
    .where(and(eq(quizAttempts.enrollmentId, enrollmentId), eq(quizAttempts.quizId, quizId)))
  return (row?.n ?? 0) + 1
}

export async function findQuizAnswers(quizAttemptId: string, executor: Executor = getDb()) {
  return executor.select().from(quizAnswers).where(eq(quizAnswers.quizAttemptId, quizAttemptId)).orderBy(asc(quizAnswers.answeredAt))
}
