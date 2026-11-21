import Link from 'next/link'
import { Icon } from '@iconify/react'
import type { MapPhase, MapTopic, NodeState } from '@workspace/core'
import { LockedNode } from './locked-node'

/** Horizontal positions (percent of the lane) that make the path wind like a board-game trail. */
const LANE = [50, 74, 82, 66, 40, 22, 18, 34]
const ROW = 116

type Point = { x: number; y: number }

function pointAt(index: number): Point {
  return { x: LANE[index % LANE.length]!, y: index * ROW + ROW / 2 }
}

export const STATE_LABEL: Record<NodeState, string> = {
  locked: 'Locked',
  available: 'Available',
  in_progress: 'In progress',
  completed: 'Completed',
}

export const STATE_PILL: Record<NodeState, string> = {
  locked: 'bg-sand/70 text-taupe dark:bg-cocoa dark:text-sand/70',
  available: 'bg-gold/15 text-[#8a6430] dark:text-gold-soft',
  in_progress: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
  completed: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300',
}

export function StatePill({ state }: { state: NodeState }) {
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider ${STATE_PILL[state]}`}>
      {STATE_LABEL[state]}
    </span>
  )
}

const nodeBase =
  'relative grid place-items-center rounded-full transition-transform duration-150 ease-out focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gold/40'

/** Candy-style raised discs: a darker inset rim along the bottom gives each node depth. */
const NODE_STYLE: Record<NodeState, string> = {
  completed: 'bg-gold text-espresso shadow-[inset_0_-6px_0_rgba(0,0,0,0.18)] hover:scale-105 active:scale-95',
  in_progress: 'bg-espresso text-gold-soft shadow-[inset_0_-6px_0_rgba(0,0,0,0.35)] hover:scale-105 active:scale-95 dark:bg-cream dark:text-espresso',
  available:
    'border-4 border-gold bg-white text-ink shadow-[inset_0_-5px_0_rgba(196,149,90,0.25)] hover:scale-105 active:scale-95 dark:bg-espresso dark:text-cream',
  locked: 'bg-sand text-taupe/80 shadow-[inset_0_-5px_0_rgba(0,0,0,0.08)] dark:bg-cocoa dark:text-sand/50',
}

export function PhaseMap({
  phase,
  readOnly,
  topicHref,
  assessmentHref,
}: {
  phase: MapPhase
  readOnly: boolean
  /** URL of a topic page; topic ids come from the server-built map. */
  topicHref: (topicId: string) => string
  assessmentHref: (assessmentId: string) => string
}) {
  const stops = phase.topics.length + (phase.assessmentId ? 1 : 0) // topics, then the phase assessment
  const height = stops * ROW
  const points = Array.from({ length: stops }, (_, i) => pointAt(i))

  return (
    <div className="relative mx-auto w-full max-w-xl" style={{ height }}>
      <svg
        aria-hidden="true"
        className="absolute inset-0 h-full w-full"
        viewBox={`0 0 100 ${height}`}
        preserveAspectRatio="none"
      >
        {points.slice(1).map((to, i) => {
          const from = points[i]!
          const reached = phase.topics[i]?.state === 'completed'
          return (
            <path
              key={i}
              d={`M ${from.x} ${from.y} C ${from.x} ${from.y + ROW / 2}, ${to.x} ${to.y - ROW / 2}, ${to.x} ${to.y}`}
              fill="none"
              vectorEffect="non-scaling-stroke"
              strokeLinecap="round"
              strokeWidth={reached ? 8 : 6}
              strokeDasharray={reached ? undefined : '2 14'}
              className={reached ? 'stroke-gold' : 'stroke-sand dark:stroke-cocoa'}
            />
          )
        })}
      </svg>

      <ol className="contents">
        {phase.topics.map((topic, i) => (
          <TopicNode key={topic.id} topic={topic} index={i} point={points[i]!} readOnly={readOnly} href={topicHref(topic.id)} />
        ))}
      </ol>

      {phase.assessmentId && <AssessmentNode phase={phase} point={points.at(-1)!} href={assessmentHref(phase.assessmentId)} />}
    </div>
  )
}

function NodeLabel({ point, children }: { point: Point; children: React.ReactNode }) {
  const onLeft = point.x >= 50
  return (
    <div
      className={`absolute top-1/2 w-[min(11rem,38vw)] -translate-y-1/2 ${onLeft ? 'right-full mr-4 text-right' : 'left-full ml-4 text-left'}`}
    >
      {children}
    </div>
  )
}

function TopicNode({
  topic,
  index,
  point,
  readOnly,
  href,
}: {
  topic: MapTopic
  index: number
  point: Point
  readOnly: boolean
  href: string
}) {
  const size = topic.isCurrent ? 'size-[4.75rem]' : 'size-16'
  const lessons = topic.lessons.length
  const ringPercent = lessons ? Math.round((topic.lessonsDone / lessons) * 100) : 0

  const face = (
    <>
      {topic.state === 'completed' ? (
        <Icon icon="lucide:check" width={30} strokeWidth={3} aria-hidden="true" />
      ) : topic.state === 'locked' ? (
        <Icon icon="solar:lock-keyhole-minimalistic-bold" width={24} aria-hidden="true" />
      ) : (
        <span className="font-display text-2xl font-semibold tabular-nums">{index + 1}</span>
      )}
    </>
  )

  const label = (
    <NodeLabel point={point}>
      <p className={`text-sm font-semibold leading-snug ${topic.state === 'locked' ? 'text-taupe dark:text-sand/50' : 'text-ink dark:text-cream'}`}>
        {topic.title}
      </p>
      <p className="mt-0.5 text-xs text-taupe dark:text-sand/60">
        {topic.state === 'completed'
          ? 'Quiz passed'
          : topic.state === 'locked'
            ? 'Locked'
            : `${topic.lessonsDone}/${lessons} lessons`}
      </p>
    </NodeLabel>
  )

  const srState = `${STATE_LABEL[topic.state]}${topic.isCurrent ? ', current topic' : ''}`

  return (
    <li
      className="absolute -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${point.x}%`, top: point.y }}
      aria-current={topic.isCurrent ? 'step' : undefined}
    >
      {topic.isCurrent && !readOnly && (
        <>
          <span
            aria-hidden="true"
            className="absolute inset-0 -m-2 animate-ping rounded-full bg-gold/30 motion-reduce:animate-none"
          />
          <span className="absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-espresso px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-gold-soft shadow dark:bg-cream dark:text-espresso">
            You are here
          </span>
        </>
      )}

      {topic.state === 'locked' ? (
        <LockedNode title={topic.title} reason={topic.lockedReason ?? 'This topic is locked.'} className={`${nodeBase} ${size} ${NODE_STYLE.locked} cursor-help`}>
          {face}
        </LockedNode>
      ) : (
        <Link
          href={href}
          aria-label={`${topic.title}: ${srState}`}
          className={`${nodeBase} ${size} ${NODE_STYLE[topic.state]}`}
          style={
            topic.state === 'in_progress'
              ? { boxShadow: `0 0 0 5px color-mix(in srgb, var(--color-gold) ${ringPercent}%, transparent), inset 0 -6px 0 rgba(0,0,0,0.35)` }
              : undefined
          }
        >
          {face}
        </Link>
      )}
      {label}
    </li>
  )
}

/** The phase gate: opens once every topic quiz in the phase is passed; passing it completes the phase. */
function AssessmentNode({ phase, point, href }: { phase: MapPhase; point: Point; href: string }) {
  const passed = phase.assessmentPassed
  const available = phase.assessmentAvailable
  const reason =
    phase.state === 'locked'
      ? (phase.lockedReason ?? 'This phase is locked.')
      : `Pass every topic quiz in “${phase.title}” first (${phase.completedTopics} of ${phase.topics.length} passed).`
  const diamond = `grid size-[4.5rem] rotate-45 place-items-center rounded-2xl transition-transform duration-150 ease-out ${
    passed
      ? 'bg-emerald-600 text-white shadow-[inset_0_-6px_0_rgba(0,0,0,0.2)] hover:scale-105'
      : available
        ? 'bg-gold-soft text-espresso shadow-[inset_0_-6px_0_rgba(0,0,0,0.18)] hover:scale-105'
        : 'bg-sand text-taupe/80 dark:bg-cocoa dark:text-sand/50'
  } focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gold/40`
  const icon = (
    <Icon
      icon={passed ? 'lucide:check' : available ? 'solar:cup-star-bold' : 'solar:lock-keyhole-minimalistic-bold'}
      width={28}
      strokeWidth={passed ? 3 : undefined}
      className="-rotate-45"
      aria-hidden="true"
    />
  )
  return (
    <div className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${point.x}%`, top: point.y }}>
      {available || passed ? (
        <Link href={href} aria-label={`Phase assessment: ${passed ? 'passed' : 'available'}`} className={diamond}>
          {icon}
        </Link>
      ) : (
        <LockedNode title="Phase assessment" reason={reason} className={`${diamond} cursor-help`}>
          {icon}
        </LockedNode>
      )}
      <NodeLabel point={point}>
        <p className="text-sm font-semibold text-ink dark:text-cream">Phase assessment</p>
        <p className="mt-0.5 text-xs text-taupe dark:text-sand/60">
          {passed ? 'Passed: phase complete' : available ? 'Ready: every topic quiz passed' : 'Pass every topic quiz in this phase to unlock'}
        </p>
      </NodeLabel>
    </div>
  )
}
