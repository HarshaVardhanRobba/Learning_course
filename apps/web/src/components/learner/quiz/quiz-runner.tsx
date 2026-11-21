'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Icon } from '@iconify/react'
import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { useTRPC } from '@/trpc/client'
import type { RouterInputs, RouterOutputs } from '@/trpc/types'
import { LEARNER_ROUTES, courseRoutes } from '@/lib/routes'
import { darkPill } from '@/lib/styles'

type QuizInput = RouterInputs['learner']['quiz']['get']
type QuizData = Extract<RouterOutputs['learner']['quiz']['get'], { kind: 'quiz' }>
type AnswerResult = RouterOutputs['learner']['quiz']['answer']
type Feedback = Extract<AnswerResult, { ok: true }>['feedback']
type Result = NonNullable<Extract<AnswerResult, { ok: true }>['result']>
type Question = QuizData['questions'][number]

const card = 'rounded-[1.75rem] border border-sand bg-white/70 dark:border-cocoa dark:bg-cocoa/40'
const secondaryButton =
  'inline-flex items-center gap-2 rounded-full border border-sand px-5 py-2.5 text-sm font-medium text-ink transition-[background-color,transform] duration-150 ease-out hover:bg-sand/50 active:scale-[0.97] disabled:opacity-50 dark:border-cocoa dark:text-cream dark:hover:bg-cocoa'
const dateFormat = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' })

const FAILURE_MESSAGE: Record<string, string> = {
  lessons_incomplete: 'Cover every lesson in this topic before taking the quiz.',
  locked: 'This topic is locked.',
  no_active_attempt: 'This enrollment attempt is no longer active.',
  quiz_finished: 'This try has already finished. Start a new one to continue.',
  already_answered: 'That question was already answered.',
  invalid_answer: 'That answer doesn’t match this question.',
  no_questions: 'This quiz has no questions yet.',
}

/**
 * Runs the quiz one question at a time through the learner.quiz tRPC procedures. The browser never has
 * the answer key: each submission is graded on the server, which returns the correct answer only then.
 */
export function QuizRunner({ input }: { input: QuizInput }) {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const router = useRouter()
  const { data } = useSuspenseQuery(trpc.learner.quiz.get.queryOptions(input))
  const [feedback, setFeedback] = React.useState<Feedback | null>(null)
  const [result, setResult] = React.useState<Result | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  const refresh = () => queryClient.invalidateQueries({ queryKey: trpc.learner.quiz.get.queryKey(input) })

  const start = useMutation(
    trpc.learner.quiz.start.mutationOptions({
      onSuccess: async (res) => {
        if (!res.ok) return setError(FAILURE_MESSAGE[res.reason] ?? 'The quiz couldn’t be started.')
        setError(null)
        setResult(null)
        setFeedback(null)
        await refresh()
      },
      onError: () => setError('The quiz couldn’t be started. Try again.'),
    }),
  )

  const answer = useMutation(
    trpc.learner.quiz.answer.mutationOptions({
      onSuccess: async (res) => {
        if (!res.ok) {
          setError(FAILURE_MESSAGE[res.reason] ?? 'That answer couldn’t be saved.')
          return refresh()
        }
        setError(null)
        setFeedback(res.feedback)
        if (res.result) {
          setResult(res.result)
          // Progress on the map, lesson pages and dashboard changed only if this was a pass.
          if (res.result.passed) router.refresh()
        }
        await refresh()
      },
      onError: () => setError('That answer couldn’t be saved. Try again.'),
    }),
  )

  if (data.kind !== 'quiz') return null
  const routes = courseRoutes(data.course)
  const mapHref = routes.map(data.attemptParam)

  const answeredIds = new Set(data.current?.answers.map((a) => a.questionId))
  const nextQuestion = data.questions.find((q) => !answeredIds.has(q.id)) ?? null
  // While feedback is on screen, keep showing the question it belongs to.
  const shownQuestion = feedback ? (data.questions.find((q) => q.id === feedback.questionId) ?? null) : nextQuestion
  const shownIndex = shownQuestion ? data.questions.findIndex((q) => q.id === shownQuestion.id) : -1

  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-24 pt-6 sm:px-6 sm:pt-8">
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-sm text-taupe dark:text-sand/70">
        <Link href={LEARNER_ROUTES.dashboard} className="hover:text-ink dark:hover:text-cream">
          Dashboard
        </Link>
        <Icon icon="solar:alt-arrow-right-linear" width={12} aria-hidden="true" />
        <Link href={mapHref} className="hover:text-ink dark:hover:text-cream">
          {data.course.title}
        </Link>
        <Icon icon="solar:alt-arrow-right-linear" width={12} aria-hidden="true" />
        <span aria-current="page" className="text-ink dark:text-cream">
          {data.topic.title}
        </span>
      </nav>

      <header className="mt-6 border-b border-sand pb-6 dark:border-cocoa">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold">Topic quiz</p>
        <h1 className="mt-1 break-words font-display text-3xl font-semibold tracking-tight text-ink sm:text-5xl dark:text-cream">{data.quiz.title}</h1>
        {data.quiz.instructions && <p className="mt-3 max-w-2xl leading-relaxed text-taupe dark:text-sand/70">{data.quiz.instructions}</p>}
        <p className="mt-2 text-sm text-taupe dark:text-sand/70">
          {data.questions.length} questions · 100% required to pass · unlimited retries
        </p>
      </header>

      {error && (
        <p role="alert" className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-900 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
          {error}
        </p>
      )}

      {data.passed && !result && !feedback && (
        <p className="mt-6 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-900 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200">
          <Icon icon="solar:cup-star-bold" width={20} className="shrink-0 text-emerald-600" aria-hidden="true" />
          You’ve passed this quiz. The topic is complete. You can still retake it for practice.
        </p>
      )}

      {result && !feedback ? (
        <ResultCard
          result={result}
          mapHref={mapHref}
          canRetry={data.editable}
          retrying={start.isPending}
          onRetry={() => start.mutate({ quizId: data.quiz.id })}
        />
      ) : !data.editable ? (
        <p className="mt-6 rounded-2xl border border-sand px-5 py-4 text-sm text-taupe dark:border-cocoa dark:text-sand/70">
          You’re viewing enrollment attempt #{data.attempt.attemptNumber}, which is no longer active. Its quiz history is shown below.
        </p>
      ) : !data.ready ? (
        <section className={`${card} mt-8 px-5 py-10 text-center sm:px-6`}>
          <Icon icon="solar:book-2-linear" width={40} className="mx-auto text-gold" aria-hidden="true" />
          <p className="mt-4 font-display text-2xl font-semibold text-ink dark:text-cream">Finish the lessons first</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-taupe dark:text-sand/70">
            {data.lessonsRemaining} lesson{data.lessonsRemaining === 1 ? '' : 's'} left in “{data.topic.title}”. The quiz opens once every lesson is completed.
          </p>
          {data.topic.firstOpenLessonId && (
            <Link href={LEARNER_ROUTES.lesson(data.topic.firstOpenLessonId)} className={`${darkPill} mt-6`}>
              Continue lessons
              <Icon icon="solar:arrow-right-linear" width={16} aria-hidden="true" />
            </Link>
          )}
        </section>
      ) : (feedback || data.current) && shownQuestion ? (
        <QuestionCard
          key={shownQuestion.id}
          question={shownQuestion}
          index={shownIndex}
          total={data.questions.length}
          answered={data.current?.answers.length ?? data.questions.length}
          feedback={feedback}
          submitting={answer.isPending}
          onSubmit={(value) => {
            if (data.current) answer.mutate({ quizAttemptId: data.current.id, questionId: shownQuestion.id, answer: value })
          }}
          onNext={() => setFeedback(null)}
        />
      ) : (
        <section className={`${card} mt-8 px-5 py-10 text-center sm:px-6`}>
          <Icon icon="solar:clipboard-list-linear" width={40} className="mx-auto text-gold" aria-hidden="true" />
          <p className="mt-4 font-display text-2xl font-semibold text-ink dark:text-cream">
            {data.history.length ? 'Ready for another try?' : 'Ready when you are'}
          </p>
          <p className="mx-auto mt-2 max-w-md text-sm text-taupe dark:text-sand/70">
            One question at a time. You’ll see right away whether each answer is correct.
          </p>
          <button type="button" className={`${darkPill} mt-6`} disabled={start.isPending} onClick={() => start.mutate({ quizId: data.quiz.id })}>
            <Icon icon={start.isPending ? 'svg-spinners:180-ring' : 'solar:play-linear'} width={16} aria-hidden="true" />
            {data.history.length ? 'Retake quiz' : 'Start quiz'}
          </button>
        </section>
      )}

      <History entries={data.history} />

      <Link href={mapHref} className="mt-10 inline-flex items-center gap-1.5 text-sm text-taupe transition-colors duration-150 hover:text-ink dark:text-sand/70 dark:hover:text-cream">
        <Icon icon="solar:arrow-left-linear" width={16} aria-hidden="true" />
        Back to the map
      </Link>
    </main>
  )
}

function QuestionCard({
  question,
  index,
  total,
  answered,
  feedback,
  submitting,
  onSubmit,
  onNext,
}: {
  question: Question
  index: number
  total: number
  answered: number
  feedback: Feedback | null
  submitting: boolean
  onSubmit: (answer: RouterInputs['learner']['quiz']['answer']['answer']) => void
  onNext: () => void
}) {
  const [optionId, setOptionId] = React.useState<string | null>(null)
  const [text, setText] = React.useState('')
  const locked = !!feedback || submitting
  const canSubmit = question.kind === 'mcq' ? !!optionId : text.trim().length > 0
  const isLast = answered >= total

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!canSubmit || locked) return
    onSubmit(question.kind === 'mcq' ? { kind: 'mcq', optionId: optionId! } : { kind: 'fill_blank', text })
  }

  return (
    <section aria-labelledby="question-prompt" className={`${card} mt-8 p-5 sm:p-8`}>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-sm text-taupe dark:text-sand/70">
        <span>
          Question <span className="font-semibold text-ink dark:text-cream">{index + 1}</span> of {total}
        </span>
        <span>{question.kind === 'mcq' ? 'Multiple choice' : 'Fill in the blank'}</span>
      </div>
      <div role="progressbar" aria-label="Quiz progress" aria-valuemin={0} aria-valuemax={total} aria-valuenow={answered} className="mt-3 h-2 overflow-hidden rounded-full bg-sand/70 dark:bg-cocoa">
        <div className="h-full rounded-full bg-gold transition-[width] duration-300 ease-out" style={{ width: `${(answered / total) * 100}%` }} />
      </div>

      <form onSubmit={submit} className="mt-6">
        <h2 id="question-prompt" className="break-words text-lg font-semibold leading-snug sm:text-xl text-ink dark:text-cream">
          {question.prompt}
        </h2>

        {question.kind === 'mcq' ? (
          <fieldset className="mt-5 space-y-3" disabled={locked}>
            <legend className="sr-only">Choose one answer</legend>
            {question.options.map((option) => {
              const chosen = optionId === option.id
              const isCorrectOption = feedback?.correct.kind === 'mcq' && feedback.correct.optionId === option.id
              const isWrongChoice = !!feedback && chosen && !feedback.isCorrect
              return (
                <label
                  key={option.id}
                  className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3.5 transition-colors duration-150 has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-gold/30 ${
                    isCorrectOption
                      ? 'border-emerald-400 bg-emerald-50 dark:border-emerald-500/40 dark:bg-emerald-500/10'
                      : isWrongChoice
                        ? 'border-rose-400 bg-rose-50 dark:border-rose-500/40 dark:bg-rose-500/10'
                        : chosen
                          ? 'border-gold bg-gold/10'
                          : 'border-sand hover:bg-sand/40 dark:border-cocoa dark:hover:bg-cocoa/60'
                  }`}
                >
                  <input type="radio" name="option" value={option.id} checked={chosen} onChange={() => setOptionId(option.id)} className="size-4 shrink-0 accent-[var(--color-gold)]" />
                  <span className="min-w-0 break-words text-ink dark:text-cream">{option.label}</span>
                  {isCorrectOption && <Icon icon="lucide:check" width={18} strokeWidth={3} className="ml-auto text-emerald-600" aria-label="Correct answer" />}
                  {isWrongChoice && <Icon icon="lucide:x" width={18} strokeWidth={3} className="ml-auto text-rose-600" aria-label="Your answer" />}
                </label>
              )
            })}
          </fieldset>
        ) : (
          <div className="mt-5">
            <label htmlFor="fill-answer" className="text-sm font-medium text-ink dark:text-cream">
              Your answer <span className="font-normal text-taupe">(not case-sensitive)</span>
            </label>
            <input
              id="fill-answer"
              type="text"
              autoComplete="off"
              spellCheck={false}
              maxLength={500}
              value={text}
              disabled={locked}
              onChange={(e) => setText(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-sand bg-white px-4 py-3 text-ink outline-none focus:border-gold focus:ring-4 focus:ring-gold/15 disabled:opacity-70 dark:border-cocoa dark:bg-espresso dark:text-cream"
            />
          </div>
        )}

        {feedback ? (
          <div aria-live="polite" className="mt-6">
            <div
              className={`rounded-2xl border px-5 py-4 ${
                feedback.isCorrect
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200'
                  : 'border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200'
              }`}
            >
              <p className="flex items-center gap-2 font-semibold">
                <Icon icon={feedback.isCorrect ? 'solar:check-circle-bold' : 'solar:close-circle-bold'} width={20} aria-hidden="true" />
                {feedback.isCorrect ? 'Correct' : 'Incorrect'}
              </p>
              {!feedback.isCorrect && (
                <p className="mt-1.5 text-sm">
                  Correct answer:{' '}
                  <span className="font-semibold">{feedback.correct.kind === 'mcq' ? feedback.correct.label : feedback.correct.answer}</span>
                </p>
              )}
              {feedback.explanation && <p className="mt-1.5 text-sm opacity-90">{feedback.explanation}</p>}
            </div>
            <button type="button" onClick={onNext} className={`${darkPill} mt-5`} autoFocus>
              {isLast ? 'See your result' : 'Next question'}
              <Icon icon="solar:arrow-right-linear" width={16} aria-hidden="true" />
            </button>
          </div>
        ) : (
          <button type="submit" disabled={!canSubmit || submitting} className={`${darkPill} mt-6 disabled:opacity-50`}>
            {submitting && <Icon icon="svg-spinners:180-ring" width={16} aria-hidden="true" />}
            Submit answer
          </button>
        )}
      </form>
    </section>
  )
}

function ResultCard({
  result,
  mapHref,
  canRetry,
  retrying,
  onRetry,
}: {
  result: Result
  mapHref: string
  canRetry: boolean
  retrying: boolean
  onRetry: () => void
}) {
  return (
    <section aria-live="polite" className={`${card} mt-8 px-5 py-10 text-center sm:px-6`}>
      <span
        className={`mx-auto grid size-24 place-items-center rounded-full ${
          result.passed ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'
        }`}
      >
        <Icon icon={result.passed ? 'solar:cup-star-bold' : 'solar:refresh-circle-linear'} width={44} aria-hidden="true" />
      </span>
      <p className="mt-5 font-display text-5xl font-semibold tabular-nums text-ink dark:text-cream">{result.scorePercent}%</p>
      <h2 className="mt-2 font-display text-3xl font-semibold text-ink dark:text-cream">
        {result.passed ? 'Passed! Topic complete.' : 'Not quite. 100% is needed to pass.'}
      </h2>
      <p className="mx-auto mt-2 max-w-md text-taupe dark:text-sand/70">
        {result.correctCount} of {result.totalQuestions} correct.
        {result.passed
          ? result.courseCompleted
            ? ' That was the last topic: the whole course is complete!'
            : ' The next part of the map is updated.'
          : ' Review the answers above and try again. Retries are unlimited.'}
      </p>
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        {!result.passed && canRetry && (
          <button type="button" onClick={onRetry} disabled={retrying} className={darkPill}>
            <Icon icon={retrying ? 'svg-spinners:180-ring' : 'solar:restart-linear'} width={16} aria-hidden="true" />
            Try again
          </button>
        )}
        <Link href={mapHref} className={result.passed ? darkPill : secondaryButton}>
          <Icon icon="solar:map-linear" width={16} aria-hidden="true" />
          Back to the map
        </Link>
      </div>
    </section>
  )
}

function History({ entries }: { entries: QuizData['history'] }) {
  if (!entries.length) return null
  return (
    <section aria-labelledby="history-heading" className="mt-10">
      <h2 id="history-heading" className="font-display text-2xl font-semibold text-ink dark:text-cream">
        Your tries
      </h2>
      <ol className="mt-4 divide-y divide-sand rounded-2xl border border-sand dark:divide-cocoa dark:border-cocoa">
        {entries.map((entry) => (
          <li key={entry.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 text-sm">
            <span className="text-ink dark:text-cream">
              Try #{entry.attemptNumber}
              {entry.finishedAt && (
                <span className="text-taupe dark:text-sand/60">
                  {' '}
                  · <time dateTime={entry.finishedAt.toISOString()}>{dateFormat.format(entry.finishedAt)}</time>
                </span>
              )}
            </span>
            <span className="flex items-center gap-3">
              <span className="tabular-nums text-taupe dark:text-sand/70">
                {entry.correctCount}/{entry.totalQuestions} · {entry.scorePercent}%
              </span>
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider ${
                  entry.passed ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300' : 'bg-sand/70 text-taupe dark:bg-cocoa dark:text-sand/70'
                }`}
              >
                {entry.passed ? 'Passed' : 'Not passed'}
              </span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  )
}
