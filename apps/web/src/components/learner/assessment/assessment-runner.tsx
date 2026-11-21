'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Icon } from '@iconify/react'
import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@workspace/ui/components/dialog'
import { useTRPC } from '@/trpc/client'
import type { RouterInputs, RouterOutputs } from '@/trpc/types'
import { LEARNER_ROUTES, courseRoutes } from '@/lib/routes'
import { darkPill } from '@/lib/styles'

type Input = RouterInputs['learner']['assessment']['get']
type Data = Extract<RouterOutputs['learner']['assessment']['get'], { kind: 'assessment' }>
type Question = Data['questions'][number]
type Answer = RouterInputs['learner']['assessment']['submit']['answers'][number]['answer']
type Submitted = Extract<RouterOutputs['learner']['assessment']['submit'], { ok: true }>
type Feedback = Submitted['review'][number]

const card = 'rounded-[1.75rem] border border-sand bg-white/70 dark:border-cocoa dark:bg-cocoa/40'
const secondaryButton =
  'inline-flex items-center gap-2 rounded-full border border-sand px-5 py-2.5 text-sm font-medium text-ink transition-[background-color,transform] duration-150 ease-out hover:bg-sand/50 active:scale-[0.97] disabled:opacity-50 dark:border-cocoa dark:text-cream dark:hover:bg-cocoa'
const dateFormat = new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' })

const FAILURE: Record<string, string> = {
  not_eligible: 'You’re not eligible for this assessment right now.',
  incomplete: 'Answer every question before submitting.',
  invalid_answer: 'One of the answers doesn’t match its question. Review and try again.',
  no_active_attempt: 'This enrollment attempt is no longer active.',
  locked: 'This assessment is locked.',
  no_questions: 'This assessment has no questions yet.',
}

type Stage = 'intro' | 'answering' | 'review' | 'result'

function hasAnswer(question: Question, answer: Answer | undefined) {
  if (!answer || answer.kind !== question.kind) return false
  return answer.kind === 'mcq' ? !!answer.optionId : answer.text.trim().length > 0
}

function answerLabel(question: Question, answer: Answer | undefined) {
  if (!answer) return 'No answer yet'
  if (answer.kind === 'fill_blank') return answer.text.trim() || 'No answer yet'
  return question.kind === 'mcq' ? (question.options.find((o) => o.id === answer.optionId)?.label ?? 'No answer yet') : 'No answer yet'
}

/**
 * Takes the phase assessment through learner.assessment. Answers stay in the browser until the learner
 * reviews and confirms; the server grades the full submission and alone decides the score and pass.
 */
export function AssessmentRunner({ input }: { input: Input }) {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const router = useRouter()
  const { data } = useSuspenseQuery(trpc.learner.assessment.get.queryOptions(input))

  const [stage, setStage] = React.useState<Stage>('intro')
  const [index, setIndex] = React.useState(0)
  const [answers, setAnswers] = React.useState<Record<string, Answer>>({})
  const [confirmOpen, setConfirmOpen] = React.useState(false)
  const [submitted, setSubmitted] = React.useState<Submitted | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  const submit = useMutation(
    trpc.learner.assessment.submit.mutationOptions({
      onSuccess: async (res) => {
        setConfirmOpen(false)
        if (!res.ok) {
          setError(res.message ?? FAILURE[res.reason] ?? 'The assessment couldn’t be submitted.')
          return
        }
        setError(null)
        setSubmitted(res)
        setStage('result')
        await queryClient.invalidateQueries({ queryKey: trpc.learner.assessment.get.queryKey(input) })
        // A pass completes the phase: refresh server-rendered progress (map, dashboard, lessons).
        if (res.result.passed) router.refresh()
      },
      onError: () => {
        setConfirmOpen(false)
        setError('The assessment couldn’t be submitted. Check your connection and try again.')
      },
    }),
  )

  if (data.kind !== 'assessment') return null
  const mapHref = courseRoutes(data.course).map(data.attemptParam)
  const questions = data.questions
  const answeredCount = questions.filter((q) => hasAnswer(q, answers[q.id])).length
  const allAnswered = answeredCount === questions.length

  const begin = () => {
    setAnswers({})
    setIndex(0)
    setSubmitted(null)
    setError(null)
    setStage('answering')
  }

  const doSubmit = () =>
    submit.mutate({
      assessmentId: data.assessment.id,
      answers: questions.map((q) => ({ questionId: q.id, answer: answers[q.id]! })),
    })

  return (
    <main className="mx-auto w-full max-w-3xl px-6 pb-24 pt-8">
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
          Phase {data.phase.position} assessment
        </span>
      </nav>

      <header className="mt-6 border-b border-sand pb-6 dark:border-cocoa">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold">
          Phase {data.phase.position} · {data.phase.title}
        </p>
        <h1 className="mt-1 font-display text-4xl font-semibold tracking-tight text-ink sm:text-5xl dark:text-cream">{data.assessment.title}</h1>
        {data.assessment.instructions && <p className="mt-3 max-w-2xl leading-relaxed text-taupe dark:text-sand/70">{data.assessment.instructions}</p>}
        <p className="mt-2 text-sm text-taupe dark:text-sand/70">{questions.length} questions · 100% required to pass · unlimited retries</p>
      </header>

      {error && (
        <p role="alert" className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-900 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
          {error}
        </p>
      )}

      {stage === 'result' && submitted ? (
        <Result submitted={submitted} questions={questions} mapHref={mapHref} canRetry={data.editable} onRetry={begin} />
      ) : !data.editable ? (
        <p className="mt-6 rounded-2xl border border-sand px-5 py-4 text-sm text-taupe dark:border-cocoa dark:text-sand/70">
          You’re viewing enrollment attempt #{data.attempt.attemptNumber}, which is no longer active. Its assessment history is shown below.
        </p>
      ) : stage === 'answering' ? (
        <QuestionStep
          key={questions[index]!.id}
          question={questions[index]!}
          index={index}
          total={questions.length}
          answeredCount={answeredCount}
          answer={answers[questions[index]!.id]}
          onAnswer={(a) => setAnswers((prev) => ({ ...prev, [questions[index]!.id]: a }))}
          onPrevious={index > 0 ? () => setIndex(index - 1) : undefined}
          onNext={() => (index < questions.length - 1 ? setIndex(index + 1) : setStage('review'))}
          onReview={() => setStage('review')}
          isLast={index === questions.length - 1}
        />
      ) : stage === 'review' ? (
        <section aria-labelledby="review-heading" className={`${card} mt-8 p-6 sm:p-8`}>
          <h2 id="review-heading" className="font-display text-2xl font-semibold text-ink dark:text-cream">
            Review your answers
          </h2>
          <p className="mt-1 text-sm text-taupe dark:text-sand/70">
            {answeredCount} of {questions.length} answered. Change any answer before you submit.
          </p>
          <ol className="mt-5 divide-y divide-sand dark:divide-cocoa">
            {questions.map((q, i) => {
              const answered = hasAnswer(q, answers[q.id])
              return (
                <li key={q.id} className="flex items-start justify-between gap-4 py-4">
                  <div className="min-w-0">
                    <p className="text-sm text-taupe dark:text-sand/60">Question {i + 1}</p>
                    <p className="mt-0.5 font-medium text-ink dark:text-cream">{q.prompt}</p>
                    <p className={`mt-1.5 text-sm ${answered ? 'text-ink dark:text-cream/90' : 'text-rose-700 dark:text-rose-300'}`}>
                      Your answer: <span className="font-semibold">{answerLabel(q, answers[q.id])}</span>
                    </p>
                  </div>
                  <button
                    type="button"
                    className={`${secondaryButton} shrink-0 px-4 py-1.5`}
                    onClick={() => {
                      setIndex(i)
                      setStage('answering')
                    }}
                  >
                    {answered ? 'Change' : 'Answer'}
                  </button>
                </li>
              )
            })}
          </ol>
          <div className="mt-6 flex flex-wrap gap-3">
            <button type="button" className={darkPill} disabled={!allAnswered} onClick={() => setConfirmOpen(true)}>
              <Icon icon="solar:upload-linear" width={16} aria-hidden="true" />
              Submit assessment
            </button>
            {!allAnswered && <p className="self-center text-sm text-taupe dark:text-sand/70">Answer every question to submit.</p>}
          </div>
        </section>
      ) : (
        <section className={`${card} mt-8 px-6 py-10 text-center`}>
          <Icon icon={data.passed ? 'solar:cup-star-bold' : 'solar:diploma-verified-linear'} width={44} className={`mx-auto ${data.passed ? 'text-emerald-600' : 'text-gold'}`} aria-hidden="true" />
          <p className="mt-4 font-display text-2xl font-semibold text-ink dark:text-cream">
            {data.passed ? 'You’ve passed this assessment' : data.history.length ? 'Ready for another try?' : 'Ready when you are'}
          </p>
          <p className="mx-auto mt-2 max-w-md text-sm text-taupe dark:text-sand/70">
            {data.passed
              ? `Phase ${data.phase.position} is complete.${data.nextPhase ? ` Phase ${data.nextPhase.position}: ${data.nextPhase.title} is unlocked.` : ''} You can retake it for practice.`
              : 'Answer every question, review your answers, then submit. You’ll see your score and the correct answers afterwards.'}
          </p>
          <button type="button" className={`${darkPill} mt-6`} onClick={begin}>
            <Icon icon="solar:play-linear" width={16} aria-hidden="true" />
            {data.history.length ? 'Retake assessment' : 'Start assessment'}
          </button>
        </section>
      )}

      <Dialog open={confirmOpen} onOpenChange={(open) => !submit.isPending && setConfirmOpen(open)}>
        <DialogContent className="rounded-[1.75rem] border-sand bg-cream p-7 sm:max-w-md dark:border-cocoa dark:bg-espresso">
          <DialogHeader>
            <DialogTitle className="font-display text-3xl font-semibold tracking-tight text-ink dark:text-cream">Submit your answers?</DialogTitle>
            <DialogDescription className="text-taupe dark:text-sand/70">
              Once submitted, this try is graded and saved. You need 100% to pass; if you don’t, you can retry as many times as you like.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="m-0 mt-2 gap-2 border-0 bg-transparent p-0 sm:justify-end">
            <DialogClose disabled={submit.isPending} className="rounded-full px-5 py-2.5 text-sm font-medium text-taupe transition-colors duration-150 hover:text-ink dark:text-sand/70 dark:hover:text-cream">
              Keep reviewing
            </DialogClose>
            <button type="button" className={darkPill} disabled={submit.isPending} onClick={doSubmit}>
              {submit.isPending && <Icon icon="svg-spinners:180-ring" width={16} aria-hidden="true" />}
              Yes, submit
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <History entries={data.history} questions={questions} />

      <Link href={mapHref} className="mt-10 inline-flex items-center gap-1.5 text-sm text-taupe transition-colors duration-150 hover:text-ink dark:text-sand/70 dark:hover:text-cream">
        <Icon icon="solar:arrow-left-linear" width={16} aria-hidden="true" />
        Back to the map
      </Link>
    </main>
  )
}

function QuestionStep({
  question,
  index,
  total,
  answeredCount,
  answer,
  onAnswer,
  onPrevious,
  onNext,
  onReview,
  isLast,
}: {
  question: Question
  index: number
  total: number
  answeredCount: number
  answer: Answer | undefined
  onAnswer: (answer: Answer) => void
  onPrevious?: () => void
  onNext: () => void
  onReview: () => void
  isLast: boolean
}) {
  return (
    <section aria-labelledby="question-prompt" className={`${card} mt-8 p-6 sm:p-8`}>
      <div className="flex items-center justify-between gap-4 text-sm text-taupe dark:text-sand/70">
        <span>
          Question <span className="font-semibold text-ink dark:text-cream">{index + 1}</span> of {total}
        </span>
        <span>
          {answeredCount} answered · {question.kind === 'mcq' ? 'Multiple choice' : 'Fill in the blank'}
        </span>
      </div>
      <div role="progressbar" aria-label="Assessment progress" aria-valuemin={0} aria-valuemax={total} aria-valuenow={answeredCount} className="mt-3 h-2 overflow-hidden rounded-full bg-sand/70 dark:bg-cocoa">
        <div className="h-full rounded-full bg-gold transition-[width] duration-300 ease-out" style={{ width: `${(answeredCount / total) * 100}%` }} />
      </div>

      <form
        className="mt-6"
        onSubmit={(e) => {
          e.preventDefault()
          onNext()
        }}
      >
        <h2 id="question-prompt" className="text-xl font-semibold leading-snug text-ink dark:text-cream">
          {question.prompt}
        </h2>

        {question.kind === 'mcq' ? (
          <fieldset className="mt-5 space-y-3">
            <legend className="sr-only">Choose one answer</legend>
            {question.options.map((option) => {
              const chosen = answer?.kind === 'mcq' && answer.optionId === option.id
              return (
                <label
                  key={option.id}
                  className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3.5 transition-colors duration-150 has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-gold/30 ${
                    chosen ? 'border-gold bg-gold/10' : 'border-sand hover:bg-sand/40 dark:border-cocoa dark:hover:bg-cocoa/60'
                  }`}
                >
                  <input
                    type="radio"
                    name="option"
                    value={option.id}
                    checked={chosen}
                    onChange={() => onAnswer({ kind: 'mcq', optionId: option.id })}
                    className="size-4 accent-[var(--color-gold)]"
                  />
                  <span className="text-ink dark:text-cream">{option.label}</span>
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
              value={answer?.kind === 'fill_blank' ? answer.text : ''}
              onChange={(e) => onAnswer({ kind: 'fill_blank', text: e.target.value })}
              className="mt-2 w-full rounded-2xl border border-sand bg-white px-4 py-3 text-ink outline-none focus:border-gold focus:ring-4 focus:ring-gold/15 dark:border-cocoa dark:bg-espresso dark:text-cream"
            />
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-3">
          {onPrevious && (
            <button type="button" className={secondaryButton} onClick={onPrevious}>
              <Icon icon="lucide:chevron-left" width={16} aria-hidden="true" />
              Previous
            </button>
          )}
          <button type="submit" className={darkPill}>
            {isLast ? 'Review answers' : 'Next question'}
            <Icon icon="lucide:chevron-right" width={16} aria-hidden="true" />
          </button>
          {!isLast && (
            <button type="button" className="text-sm text-taupe underline-offset-4 hover:text-ink hover:underline dark:text-sand/70 dark:hover:text-cream" onClick={onReview}>
              Go to review
            </button>
          )}
        </div>
      </form>
    </section>
  )
}

function Result({
  submitted,
  questions,
  mapHref,
  canRetry,
  onRetry,
}: {
  submitted: Submitted
  questions: Question[]
  mapHref: string
  canRetry: boolean
  onRetry: () => void
}) {
  const { result, review } = submitted
  return (
    <>
      <section aria-live="polite" className={`${card} mt-8 px-6 py-10 text-center`}>
        <span
          className={`mx-auto grid size-24 place-items-center rounded-full ${
            result.passed ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'
          }`}
        >
          <Icon icon={result.passed ? 'solar:cup-star-bold' : 'solar:refresh-circle-linear'} width={44} aria-hidden="true" />
        </span>
        <p className="mt-5 font-display text-5xl font-semibold tabular-nums text-ink dark:text-cream">{result.scorePercent}%</p>
        <h2 className="mt-2 font-display text-3xl font-semibold text-ink dark:text-cream">
          {result.passed ? 'Passed! Phase complete.' : 'Not passed. 100% is needed.'}
        </h2>
        <p className="mx-auto mt-2 max-w-md text-taupe dark:text-sand/70">
          {result.correctCount} of {result.totalQuestions} correct (try #{result.attemptNumber}).
          {result.passed
            ? result.courseCompleted
              ? ' That was the final phase: the whole course is complete!'
              : result.nextPhase
                ? ` Phase ${result.nextPhase.position}: ${result.nextPhase.title} is now unlocked.`
                : ''
            : ' Check the corrections below, then try again. Retries are unlimited.'}
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          {!result.passed && canRetry && (
            <button type="button" onClick={onRetry} className={darkPill}>
              <Icon icon="solar:restart-linear" width={16} aria-hidden="true" />
              Retry assessment
            </button>
          )}
          <Link href={mapHref} className={result.passed ? darkPill : secondaryButton}>
            <Icon icon="solar:map-linear" width={16} aria-hidden="true" />
            Back to the map
          </Link>
        </div>
      </section>
      <ReviewList review={review} questions={questions} className="mt-6" />
    </>
  )
}

function ReviewList({ review, questions, className = '' }: { review: Feedback[]; questions: Question[]; className?: string }) {
  return (
    <ol className={`space-y-3 ${className}`}>
      {review.map((item, i) => {
        const question = questions.find((q) => q.id === item.questionId)
        if (!question) return null
        const given = answerLabel(question, item.given)
        const correct = item.correct.kind === 'mcq' ? item.correct.label : item.correct.answer
        return (
          <li
            key={item.questionId}
            className={`rounded-2xl border px-5 py-4 ${
              item.isCorrect ? 'border-emerald-200 dark:border-emerald-500/20' : 'border-rose-200 dark:border-rose-500/20'
            }`}
          >
            <p className="flex items-start gap-2 font-medium text-ink dark:text-cream">
              <Icon
                icon={item.isCorrect ? 'solar:check-circle-bold' : 'solar:close-circle-bold'}
                width={20}
                className={`mt-0.5 shrink-0 ${item.isCorrect ? 'text-emerald-600' : 'text-rose-600'}`}
                aria-label={item.isCorrect ? 'Correct' : 'Incorrect'}
              />
              <span>
                {i + 1}. {question.prompt}
              </span>
            </p>
            <p className="mt-1.5 pl-7 text-sm text-taupe dark:text-sand/70">
              Your answer: <span className="font-semibold text-ink dark:text-cream">{given}</span>
            </p>
            {!item.isCorrect && (
              <p className="mt-0.5 pl-7 text-sm text-taupe dark:text-sand/70">
                Correct answer: <span className="font-semibold text-emerald-800 dark:text-emerald-300">{correct}</span>
              </p>
            )}
            {item.explanation && <p className="mt-1 pl-7 text-sm text-taupe dark:text-sand/60">{item.explanation}</p>}
          </li>
        )
      })}
    </ol>
  )
}

function History({ entries, questions }: { entries: Data['history']; questions: Question[] }) {
  if (!entries.length) return null
  return (
    <section aria-labelledby="history-heading" className="mt-10">
      <h2 id="history-heading" className="font-display text-2xl font-semibold text-ink dark:text-cream">
        Your tries
      </h2>
      <ol className="mt-4 space-y-3">
        {entries.map((entry) => (
          <li key={entry.id}>
            <details className="group rounded-2xl border border-sand dark:border-cocoa">
              <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 px-5 py-3.5 text-sm [&::-webkit-details-marker]:hidden">
                <span className="flex items-center gap-2 text-ink dark:text-cream">
                  <Icon icon="lucide:chevron-right" width={14} aria-hidden="true" className="transition-transform duration-150 group-open:rotate-90" />
                  Try #{entry.attemptNumber}
                  <span className="text-taupe dark:text-sand/60">
                    · <time dateTime={entry.submittedAt.toISOString()}>{dateFormat.format(entry.submittedAt)}</time>
                  </span>
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
              </summary>
              <ReviewList review={entry.review} questions={questions} className="px-5 pb-5" />
            </details>
          </li>
        ))}
      </ol>
    </section>
  )
}
