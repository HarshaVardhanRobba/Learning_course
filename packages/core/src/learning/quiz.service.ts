import 'server-only'
import { and, eq, isNull } from 'drizzle-orm'
import { getDb, quizAnswers, quizAttempts, type CourseKind, type QuizAttempt } from '@workspace/db'
import { isUniqueViolation } from '../lib/pg-errors'
import { findTopic, type MapTopic } from './course-map'
import { findCourseAttempts, findCourseRef } from './course-map.repository'
import {
  FOUNDATION_LOCK_REASON,
  accessBlock,
  loadMap,
  markTopicPassed,
  toAttemptInfo,
  withLiveAttempt,
  type AttemptInfo,
  type ProgressFailure,
} from './course-learning.service'
import { grade, scoreQuiz, toFeedback, toPublic, type AnswerFeedback, type PublicQuestion } from './quiz-answer'
export type { AnswerFeedback, CorrectAnswer, PublicQuestion } from './quiz-answer'
import {
  findNextQuizAttemptNumber,
  findOpenQuizAttempt,
  findQuestionsWithKey,
  findQuizAnswers,
  findQuizAttempts,
  findQuizLocation,
  type QuestionWithKey,
} from './quiz.repository'
import type { QuizAnswerInput } from './quiz.schema'

export type QuizHistoryEntry = Pick<QuizAttempt, 'id' | 'attemptNumber' | 'startedAt' | 'finishedAt' | 'correctCount' | 'totalQuestions' | 'scorePercent' | 'passed'>

export type QuizView =
  | { kind: 'not_found' }
  | { kind: 'locked'; title: string; reason: string; course: { kind: CourseKind; slug: string } }
  | {
      kind: 'quiz'
      quiz: { id: string; title: string; instructions: string }
      course: { id: string; kind: CourseKind; slug: string; title: string }
      topic: { id: string; title: string; firstOpenLessonId: string | null }
      attempt: AttemptInfo
      /** Live enrollment attempt; older attempts are read-only history. */
      editable: boolean
      attemptParam: number | undefined
      /** Lessons must be covered before the quiz can be taken. */
      ready: boolean
      lessonsRemaining: number
      passed: boolean
      questions: PublicQuestion[]
      /** The unfinished try, with feedback for the questions answered so far. */
      current: { id: string; attemptNumber: number; answers: AnswerFeedback[] } | null
      history: QuizHistoryEntry[]
    }

const lessonsLeft = (topic: MapTopic) => topic.lessons.length - topic.lessonsDone

/**
 * The quiz must belong to a topic in the version of one of the learner's own attempts, the course must be
 * open to them, and the topic must be unlocked. Pass the session-resolved user id only.
 */
export async function getQuizView(userId: string, quizId: string, attemptNumber?: number): Promise<QuizView> {
  const db = getDb()
  const location = await findQuizLocation(quizId, db)
  if (!location) return { kind: 'not_found' }
  const course = await findCourseRef({ id: location.courseId }, db)
  if (!course) return { kind: 'not_found' }
  const block = await accessBlock(userId, course, db)
  if (block === 'not_found') return { kind: 'not_found' }

  const onVersion = (await findCourseAttempts(userId, course.id, db)).filter((a) => a.courseVersionId === location.courseVersionId)
  const live = onVersion.find((a) => a.status === 'in_progress')
  const attempt = attemptNumber !== undefined ? onVersion.find((a) => a.attemptNumber === attemptNumber) : (live ?? onVersion[0])
  if (!attempt) return { kind: 'not_found' }

  const courseInfo = { kind: course.kind, slug: course.slug }
  if (block === 'locked') return { kind: 'locked', title: location.title, reason: FOUNDATION_LOCK_REASON, course: courseInfo }

  const found = findTopic(await loadMap(attempt, db), location.topicId)
  if (!found) return { kind: 'not_found' }
  const { topic } = found
  if (topic.state === 'locked') {
    return { kind: 'locked', title: location.title, reason: topic.lockedReason ?? 'This quiz is locked.', course: courseInfo }
  }

  const [questions, history] = await Promise.all([findQuestionsWithKey(quizId, db), findQuizAttempts(attempt.id, quizId, db)])
  const open = history.find((h) => h.finishedAt === null) ?? null
  const answers = open ? await findQuizAnswers(open.id, db) : []
  const byId = new Map(questions.map((q) => [q.id, q]))

  return {
    kind: 'quiz',
    quiz: { id: location.quizId, title: location.title, instructions: location.instructions },
    course: { id: course.id, kind: course.kind, slug: course.slug, title: attempt.versionTitle },
    topic: { id: topic.id, title: topic.title, firstOpenLessonId: topic.lessons.find((l) => !l.done)?.id ?? null },
    attempt: toAttemptInfo(attempt),
    editable: attempt.status === 'in_progress',
    attemptParam: live && live.id === attempt.id ? undefined : attempt.attemptNumber,
    ready: topic.state === 'completed' || lessonsLeft(topic) === 0,
    lessonsRemaining: lessonsLeft(topic),
    passed: topic.state === 'completed' || history.some((h) => h.passed),
    questions: questions.map(toPublic),
    current: open
      ? {
          id: open.id,
          attemptNumber: open.attemptNumber,
          answers: answers.flatMap((a) => {
            const q = byId.get(a.questionId)
            return q ? [toFeedback(q, a)] : []
          }),
        }
      : null,
    history: history
      .filter((h) => h.finishedAt !== null)
      .map(({ id, attemptNumber, startedAt, finishedAt, correctCount, totalQuestions, scorePercent, passed }) => ({
        id,
        attemptNumber,
        startedAt,
        finishedAt,
        correctCount,
        totalQuestions,
        scorePercent,
        passed,
      })),
  }
}

type QuizFailure = ProgressFailure | { ok: false; reason: 'no_questions' | 'quiz_finished' | 'already_answered' | 'invalid_answer' }

export type StartQuizResult = { ok: true; quizAttemptId: string } | QuizFailure

/** Starts a new try (unlimited), or returns the unfinished one. Only on the live enrollment attempt. */
export async function startQuizAttempt(userId: string, quizId: string): Promise<StartQuizResult> {
  const location = await findQuizLocation(quizId)
  if (!location) return { ok: false, reason: 'not_found' }

  try {
    return await withLiveAttempt(userId, location.courseId, location.topicId, async ({ tx, attempt, topic }): Promise<StartQuizResult> => {
      if (lessonsLeft(topic) > 0 && topic.state !== 'completed') return { ok: false, reason: 'lessons_incomplete' }
      const open = await findOpenQuizAttempt(attempt.id, quizId, tx)
      if (open) return { ok: true, quizAttemptId: open.id }

      const questions = await findQuestionsWithKey(quizId, tx)
      if (!questions.length) return { ok: false, reason: 'no_questions' }
      const [created] = await tx
        .insert(quizAttempts)
        .values({
          enrollmentId: attempt.id,
          quizId,
          attemptNumber: await findNextQuizAttemptNumber(attempt.id, quizId, tx),
          totalQuestions: questions.length,
        })
        .returning({ id: quizAttempts.id })
      return { ok: true, quizAttemptId: created!.id }
    })
  } catch (error) {
    // A double click can race past the open-try check; the partial unique index rejects the second insert.
    if (isUniqueViolation(error)) return startQuizAttempt(userId, quizId)
    throw error
  }
}

export type QuizResult = { correctCount: number; totalQuestions: number; scorePercent: number; passed: boolean; courseCompleted: boolean }

export type SubmitAnswerResult = { ok: true; feedback: AnswerFeedback; result: QuizResult | null } | QuizFailure

/**
 * Grades one answer on the server and stores it against the try. The correct answer is returned only
 * in this response, after submission. Answering the last question finalizes the score; a 100% pass is
 * the only thing that completes the topic.
 */
export async function submitQuizAnswer(params: {
  userId: string
  quizAttemptId: string
  questionId: string
  answer: QuizAnswerInput
}): Promise<SubmitAnswerResult> {
  const db = getDb()
  const [quizAttempt] = await db.select().from(quizAttempts).where(eq(quizAttempts.id, params.quizAttemptId)).limit(1)
  if (!quizAttempt) return { ok: false, reason: 'not_found' }
  const location = await findQuizLocation(quizAttempt.quizId, db)
  if (!location) return { ok: false, reason: 'not_found' }

  try {
    return await withLiveAttempt(params.userId, location.courseId, location.topicId, async ({ tx, course, attempt }): Promise<SubmitAnswerResult> => {
      // The try must belong to this learner's live enrollment attempt and still be open (row-locked).
      const open = await findOpenQuizAttempt(attempt.id, quizAttempt.quizId, tx, true)
      if (!open || open.id !== params.quizAttemptId) return { ok: false, reason: 'quiz_finished' }

      const questions = await findQuestionsWithKey(open.quizId, tx)
      const question = questions.find((q) => q.id === params.questionId)
      if (!question) return { ok: false, reason: 'not_found' }

      const isCorrect = grade(question, params.answer)
      if (isCorrect === null) return { ok: false, reason: 'invalid_answer' }

      const row = {
        quizAttemptId: open.id,
        questionId: question.id,
        selectedOptionId: params.answer.kind === 'mcq' ? params.answer.optionId : null,
        textAnswer: params.answer.kind === 'fill_blank' ? params.answer.text : null,
        isCorrect,
      }
      const inserted = await tx.insert(quizAnswers).values(row).onConflictDoNothing().returning({ id: quizAnswers.id })
      if (!inserted.length) return { ok: false, reason: 'already_answered' }

      const feedback = toFeedback(question, row)
      const answers = await findQuizAnswers(open.id, tx)
      if (answers.length < open.totalQuestions) return { ok: true, feedback, result: null }

      const correctCount = answers.filter((a) => a.isCorrect).length
      const { scorePercent, passed } = scoreQuiz(correctCount, open.totalQuestions)
      await tx
        .update(quizAttempts)
        .set({ finishedAt: new Date(), correctCount, scorePercent, passed })
        .where(and(eq(quizAttempts.id, open.id), isNull(quizAttempts.finishedAt)))

      let courseCompleted = false
      if (passed) {
        const progress = await markTopicPassed(tx, course, attempt, location.topicId)
        courseCompleted = progress.ok && progress.courseCompleted
      }
      return { ok: true, feedback, result: { correctCount, totalQuestions: open.totalQuestions, scorePercent, passed, courseCompleted } }
    })
  } catch (error) {
    if (isUniqueViolation(error)) return { ok: false, reason: 'already_answered' }
    throw error
  }
}
