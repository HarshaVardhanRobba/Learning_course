'use client'

import * as React from 'react'
import { Icon } from '@iconify/react'
import { GetStartedButton } from '@/components/auth/get-started-button'
import { RevealSection } from '@/components/marketing/reveal-section'
import { darkPill, eyebrow, goldText } from '@/lib/styles'

export type RoadmapStep = { title: string; description: string; state: 'completed' | 'current' | 'locked' }

export type ExploreData = {
  foundationTopics: string[]
  streams: { slug: string; title: string; tracks: string[] }[]
  totalTracks: number
  roadmaps: { streamTitle: string; trackTitle: string; steps: RoadmapStep[]; remaining: number }[]
}

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'streams', label: 'Streams' },
  { id: 'roadmap', label: 'Roadmap' },
  { id: 'progress', label: 'Progress' },
] as const
type TabId = (typeof TABS)[number]['id']

const STREAM_META: Record<string, { icon: string; blurb: string }> = {
  'full-stack': {
    icon: 'solar:code-square-linear',
    blurb: 'Build complete products: back end, front end, databases and deployment, in the stack employers hire for.',
  },
  infrastructure: {
    icon: 'solar:server-square-linear',
    blurb: 'Run the platforms everything else depends on: cloud, DevOps, reliability, networks and cost.',
  },
  data: {
    icon: 'solar:chart-square-linear',
    blurb: 'Turn raw data into pipelines, dashboards, models and AI features that teams can trust.',
  },
  'cyber-security': {
    icon: 'solar:shield-keyhole-linear',
    blurb: 'Defend, test and govern systems: from the SOC and identity to cloud security and pen testing.',
  },
}

const card = 'rounded-[1.5rem] border border-sand bg-white/60 dark:border-cocoa dark:bg-cocoa/40'

/**
 * The four sections of the public streams page. The same page is shown to visitors and signed-in learners:
 * it explains what the app gives a learner. The selected tab is kept in the URL hash so it can be linked.
 */
export function ExploreTabs({ data }: { data: ExploreData }) {
  const [active, setActive] = React.useState<TabId>('overview')
  const tabRefs = React.useRef<(HTMLButtonElement | null)[]>([])

  React.useEffect(() => {
    const fromHash = window.location.hash.slice(1)
    if (TABS.some((t) => t.id === fromHash)) setActive(fromHash as TabId)
  }, [])

  const select = (id: TabId) => {
    setActive(id)
    window.history.replaceState(null, '', `#${id}`)
  }

  const onKeyDown = (event: React.KeyboardEvent, index: number) => {
    const delta = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0
    if (!delta) return
    event.preventDefault()
    const next = (index + delta + TABS.length) % TABS.length
    select(TABS[next]!.id)
    tabRefs.current[next]?.focus()
  }

  return (
    <section className="py-16">
      <div className="mx-auto max-w-7xl px-6 lg:px-10">
        <div className="flex justify-center">
          <div
            role="tablist"
            aria-label="Learning sections"
            className="flex flex-wrap items-center gap-1 rounded-full border border-sand bg-white/60 p-1 text-sm dark:border-cocoa dark:bg-cocoa/40"
          >
            {TABS.map((tab, i) => {
              const selected = tab.id === active
              return (
                <button
                  key={tab.id}
                  ref={(el) => {
                    tabRefs.current[i] = el
                  }}
                  type="button"
                  role="tab"
                  id={`explore-tab-${tab.id}`}
                  aria-selected={selected}
                  aria-controls={`explore-panel-${tab.id}`}
                  tabIndex={selected ? 0 : -1}
                  onClick={() => select(tab.id)}
                  onKeyDown={(e) => onKeyDown(e, i)}
                  className={`rounded-full px-5 py-2 transition-[background-color,color] duration-200 ease-out focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gold/30 ${
                    selected
                      ? 'bg-espresso text-cream dark:bg-cream dark:text-espresso'
                      : 'text-taupe hover:text-ink dark:text-sand/70 dark:hover:text-cream'
                  }`}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Only the active panel is mounted, so its reveal animation plays each time it is opened. */}
        <div role="tabpanel" id={`explore-panel-${active}`} aria-labelledby={`explore-tab-${active}`} className="mt-14">
          {active === 'overview' && <OverviewPanel data={data} onExplore={() => select('streams')} />}
          {active === 'streams' && <StreamsPanel data={data} />}
          {active === 'roadmap' && <RoadmapPanel data={data} />}
          {active === 'progress' && <ProgressPanel />}
        </div>
      </div>
    </section>
  )
}

function PanelHeading({ tag, title, accent, body }: { tag: string; title: string; accent: string; body: string }) {
  return (
    <div className="text-center">
      <span className={`${eyebrow} border-sand text-taupe dark:border-cocoa dark:text-sand/70`}>
        <span className="size-1.5 rounded-full bg-gold" />
        {tag}
      </span>
      <h2 className="mt-5 font-display text-5xl font-medium tracking-tight text-ink sm:text-6xl dark:text-cream">
        {title} <span className={goldText}>{accent}</span>
      </h2>
      <p className="mx-auto mt-4 max-w-xl leading-relaxed text-taupe dark:text-sand/70">{body}</p>
    </div>
  )
}

function OverviewPanel({ data, onExplore }: { data: ExploreData; onExplore: () => void }) {
  const journey = [
    {
      icon: 'solar:map-point-wave-linear',
      title: 'Common Foundation',
      body: 'Everyone starts here: the shared groundwork every technology role relies on.',
    },
    {
      icon: 'solar:routing-2-linear',
      title: 'Choose a stream',
      body: `${data.streams.length} streams, ${data.totalTracks} roles. Pick the direction that fits you.`,
    },
    {
      icon: 'solar:layers-minimalistic-linear',
      title: 'Master your role',
      body: 'Core skills phase by phase, plus how AI changes that exact job.',
    },
    {
      icon: 'solar:cup-star-linear',
      title: 'Prove it',
      body: 'A capstone project that ties everything together, ready to show employers.',
    },
  ]
  const pillars = [
    { icon: 'solar:code-linear', title: 'Technical depth', body: 'Languages, frameworks, cloud and tools used on real client projects.' },
    { icon: 'solar:magic-stick-3-linear', title: 'AI-ready', body: 'Every role includes the AI tools and practices that job now expects.' },
    { icon: 'solar:users-group-rounded-linear', title: 'Ways of working', body: 'Agile, Scrum, Jira, status updates and explaining your work clearly.' },
    { icon: 'solar:user-speak-linear', title: 'Professional skills', body: 'Client communication and interview readiness, not just code.' },
  ]

  return (
    <div>
      <PanelHeading
        tag="Overview"
        title="One journey, a"
        accent="complete professional"
        body="Most courses teach a tool. This path builds the whole person a team wants to hire: solid fundamentals, deep role skills, AI fluency and the habits of someone who ships with others."
      />

      <RevealSection className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {journey.map((step, i) => (
          <article key={step.title} data-reveal className={`${card} relative p-6`}>
            <span className="font-display text-lg italic text-taupe">/0{i + 1}</span>
            <span className="mt-3 grid size-12 place-items-center rounded-2xl bg-espresso text-gold-soft dark:bg-cream dark:text-espresso">
              <Icon icon={step.icon} width={24} aria-hidden="true" />
            </span>
            <h3 className="mt-4 font-display text-2xl font-semibold text-ink dark:text-cream">{step.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-taupe dark:text-sand/70">{step.body}</p>
            {i < journey.length - 1 && (
              <Icon
                icon="solar:arrow-right-linear"
                width={20}
                aria-hidden="true"
                className="absolute -right-4 top-1/2 hidden -translate-y-1/2 text-gold lg:block"
              />
            )}
          </article>
        ))}
      </RevealSection>

      <div className="mt-16 grid gap-10 lg:grid-cols-2">
        <div>
          <h3 className="font-display text-3xl font-semibold text-ink dark:text-cream">What the foundation covers</h3>
          <p className="mt-2 text-taupe dark:text-sand/70">Nine topics every learner completes before choosing a stream.</p>
          <RevealSection className="mt-5 flex flex-wrap gap-2.5" y={12} stagger={0.04}>
            {data.foundationTopics.map((topic) => (
              <span key={topic} data-reveal className="rounded-full border border-sand px-4 py-2 text-sm text-ink dark:border-cocoa dark:text-cream">
                {topic}
              </span>
            ))}
          </RevealSection>
        </div>
        <div>
          <h3 className="font-display text-3xl font-semibold text-ink dark:text-cream">Learning everything that matters</h3>
          <RevealSection className="mt-5 grid gap-4 sm:grid-cols-2" y={16}>
            {pillars.map((p) => (
              <div key={p.title} data-reveal className="flex gap-3">
                <Icon icon={p.icon} width={22} className="mt-0.5 shrink-0 text-gold" aria-hidden="true" />
                <div>
                  <p className="font-semibold text-ink dark:text-cream">{p.title}</p>
                  <p className="mt-0.5 text-sm text-taupe dark:text-sand/70">{p.body}</p>
                </div>
              </div>
            ))}
          </RevealSection>
        </div>
      </div>

      <div className="mt-14 flex flex-wrap justify-center gap-3">
        <GetStartedButton className={darkPill} />
        <button
          type="button"
          onClick={onExplore}
          className="inline-flex items-center gap-2 rounded-full border border-sand px-5 py-2.5 text-sm font-medium text-ink transition-[background-color,transform] duration-150 ease-out hover:bg-sand/50 active:scale-[0.97] dark:border-cocoa dark:text-cream dark:hover:bg-cocoa"
        >
          Explore the streams
        </button>
      </div>
    </div>
  )
}

function StreamsPanel({ data }: { data: ExploreData }) {
  return (
    <div>
      <PanelHeading
        tag="Streams"
        title="Four streams,"
        accent="one for you"
        body="After the foundation, pick a stream and a role inside it. Each role is its own track with phases, quizzes, assessments and a capstone."
      />
      <RevealSection className="mt-14 grid gap-5 md:grid-cols-2">
        {data.streams.map((stream) => {
          const meta = STREAM_META[stream.slug] ?? { icon: 'solar:routing-2-linear', blurb: '' }
          return (
            <article key={stream.slug} data-reveal className={`${card} flex flex-col p-7`}>
              <div className="flex items-start justify-between gap-4">
                <span className="grid size-14 place-items-center rounded-2xl bg-espresso text-gold-soft dark:bg-cream dark:text-espresso">
                  <Icon icon={meta.icon} width={28} aria-hidden="true" />
                </span>
                <span className="rounded-full bg-gold/15 px-3 py-1 text-xs font-semibold text-[#8a6430] dark:text-gold-soft">
                  {stream.tracks.length} roles
                </span>
              </div>
              <h3 className="mt-5 font-display text-3xl font-semibold text-ink dark:text-cream">{stream.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-taupe dark:text-sand/70">{meta.blurb}</p>
              <ul className="mt-5 flex flex-wrap gap-2">
                {stream.tracks.map((track) => (
                  <li key={track} className="rounded-full border border-sand px-3 py-1.5 text-xs text-ink dark:border-cocoa dark:text-cream">
                    {track}
                  </li>
                ))}
              </ul>
            </article>
          )
        })}
      </RevealSection>
    </div>
  )
}

const STEP_STYLE: Record<RoadmapStep['state'], { dot: string; icon: string; label: string }> = {
  completed: { dot: 'bg-gold text-espresso', icon: 'lucide:check', label: 'Completed' },
  current: { dot: 'bg-espresso text-gold-soft ring-4 ring-gold/30 dark:bg-cream dark:text-espresso', icon: 'solar:play-bold', label: 'In progress' },
  locked: { dot: 'bg-sand text-taupe dark:bg-cocoa dark:text-sand/60', icon: 'solar:lock-keyhole-minimalistic-bold', label: 'Locked' },
}

function RoadmapPanel({ data }: { data: ExploreData }) {
  return (
    <div>
      <PanelHeading
        tag="Roadmap"
        title="Your own"
        accent="interactive roadmap"
        body="Every learner gets a personal map for their role. Here’s a short excerpt of two: tap a step to see what you learn there. Steps unlock as you pass the ones before them."
      />
      <div className="mt-14 grid gap-8 lg:grid-cols-2">
        {data.roadmaps.map((roadmap) => (
          <RoadmapColumn key={roadmap.trackTitle} roadmap={roadmap} />
        ))}
      </div>
      <p className="mt-10 text-center text-sm text-taupe dark:text-sand/60">
        Example progress shown. Your real roadmap tracks your own attempts.
      </p>
    </div>
  )
}

function RoadmapColumn({ roadmap }: { roadmap: ExploreData['roadmaps'][number] }) {
  const [open, setOpen] = React.useState<number | null>(roadmap.steps.findIndex((s) => s.state === 'current'))
  return (
    <article className={`${card} p-6 sm:p-8`}>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">{roadmap.streamTitle} stream</p>
      <h3 className="mt-1 font-display text-3xl font-semibold text-ink dark:text-cream">{roadmap.trackTitle}</h3>

      <RevealSection className="relative mt-6" y={20} stagger={0.1}>
        <span aria-hidden="true" className="absolute bottom-6 left-[19px] top-6 w-0.5 bg-[repeating-linear-gradient(to_bottom,var(--color-gold)_0_6px,transparent_6px_12px)] opacity-60" />
        <ol className="space-y-3">
          {roadmap.steps.map((step, i) => {
            const style = STEP_STYLE[step.state]
            const expanded = open === i
            const locked = step.state === 'locked'
            return (
              <li key={step.title} data-reveal className="relative">
                <button
                  type="button"
                  aria-expanded={expanded}
                  onClick={() => setOpen(expanded ? null : i)}
                  className={`flex w-full items-start gap-4 rounded-2xl p-2 text-left transition-colors duration-150 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gold/30 ${
                    expanded ? 'bg-sand/50 dark:bg-cocoa/70' : 'hover:bg-sand/30 dark:hover:bg-cocoa/50'
                  }`}
                >
                  <span className={`relative z-10 grid size-10 shrink-0 place-items-center rounded-full ${style.dot}`}>
                    <Icon icon={style.icon} width={16} aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1 pt-1">
                    <span className="flex items-center justify-between gap-3">
                      <span className={`font-semibold ${locked ? 'text-ink/60 dark:text-cream/50' : 'text-ink dark:text-cream'}`}>
                        {i + 1}. {step.title}
                      </span>
                      <span className="flex items-center gap-2 text-xs text-taupe dark:text-sand/60">
                        {style.label}
                        <Icon
                          icon="lucide:chevron-down"
                          width={16}
                          aria-hidden="true"
                          className={`transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
                        />
                      </span>
                    </span>
                    <span
                      className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
                        expanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                      }`}
                    >
                      <span className="overflow-hidden">
                        <span className="mt-2 block text-sm leading-relaxed text-taupe dark:text-sand/70">{step.description}</span>
                      </span>
                    </span>
                  </span>
                </button>
              </li>
            )
          })}
        </ol>
      </RevealSection>
      {roadmap.remaining > 0 && (
        <p className="mt-4 pl-14 text-sm text-taupe dark:text-sand/60">+ {roadmap.remaining} more topics, phase assessments and a capstone</p>
      )}
    </article>
  )
}

function ProgressPanel() {
  const items = [
    {
      icon: 'solar:checklist-minimalistic-linear',
      title: 'Topic quizzes',
      body: 'Every topic ends with a quiz of multiple-choice and fill-in-the-blank questions. You see right away whether each answer is correct, and the right answer when it isn’t.',
      points: ['Multiple choice (MCQ)', 'Fill in the blank', '100% to pass, unlimited retries'],
    },
    {
      icon: 'solar:diploma-verified-linear',
      title: 'Phase assessments',
      body: 'Once every topic quiz in a phase is passed, the phase assessment opens. Review your answers, submit, and a 100% score completes the phase and unlocks the next one.',
      points: ['Covers the whole phase', 'Review before you submit', 'Unlocks the next phase'],
    },
    {
      icon: 'solar:chart-2-linear',
      title: 'Progress you can see',
      body: 'Your map, dashboard and history update from your real results. Badges mark milestones, and every attempt keeps its own scores.',
      points: ['Live progress per course', 'Badges for milestones', 'Full attempt history'],
    },
  ]
  return (
    <div>
      <PanelHeading
        tag="Progress"
        title="Progress you"
        accent="actually earn"
        body="Nothing is marked complete just for opening it. Progress comes from passing topic quizzes and phase assessments, checked on our side."
      />
      <RevealSection className="mt-14 grid gap-5 lg:grid-cols-3">
        {items.map((item) => (
          <article key={item.title} data-reveal className={`${card} flex flex-col p-7`}>
            <span className="grid size-12 place-items-center rounded-2xl bg-gold/15 text-gold">
              <Icon icon={item.icon} width={24} aria-hidden="true" />
            </span>
            <h3 className="mt-5 font-display text-2xl font-semibold text-ink dark:text-cream">{item.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-taupe dark:text-sand/70">{item.body}</p>
            <ul className="mt-5 space-y-2">
              {item.points.map((point) => (
                <li key={point} className="flex items-center gap-2 text-sm text-ink dark:text-cream">
                  <Icon icon="solar:check-circle-bold" width={16} className="text-gold" aria-hidden="true" />
                  {point}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </RevealSection>

      <div className="mt-12 grid gap-5 lg:grid-cols-2">
        <SampleMcq />
        <SampleFillBlank />
      </div>
    </div>
  )
}

/** A self-contained sample so visitors can feel the instant feedback. Not connected to real progress. */
function SampleMcq() {
  const options = ['git branch feature', 'git commit feature', 'git push feature']
  const [picked, setPicked] = React.useState<number | null>(null)
  return (
    <article className={`${card} p-6`}>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">Try it · multiple choice</p>
      <p className="mt-2 font-semibold text-ink dark:text-cream">Which command creates a new Git branch called “feature”?</p>
      <div className="mt-4 space-y-2">
        {options.map((option, i) => {
          const chosen = picked === i
          const correct = i === 0
          return (
            <button
              key={option}
              type="button"
              onClick={() => setPicked(i)}
              className={`flex w-full items-center justify-between rounded-xl border px-4 py-2.5 text-left font-mono text-sm transition-colors duration-150 ${
                picked !== null && correct
                  ? 'border-emerald-400 bg-emerald-50 text-emerald-900 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-200'
                  : chosen
                    ? 'border-rose-400 bg-rose-50 text-rose-900 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-200'
                    : 'border-sand text-ink hover:bg-sand/40 dark:border-cocoa dark:text-cream dark:hover:bg-cocoa/60'
              }`}
            >
              {option}
              {picked !== null && correct && <Icon icon="lucide:check" width={16} strokeWidth={3} aria-label="Correct" />}
              {chosen && !correct && <Icon icon="lucide:x" width={16} strokeWidth={3} aria-label="Incorrect" />}
            </button>
          )
        })}
      </div>
      <p aria-live="polite" className="mt-3 min-h-5 text-sm text-taupe dark:text-sand/70">
        {picked === null ? '' : picked === 0 ? 'Correct!' : 'Not quite: the correct answer is highlighted.'}
      </p>
    </article>
  )
}

function SampleFillBlank() {
  const [value, setValue] = React.useState('')
  const [result, setResult] = React.useState<boolean | null>(null)
  return (
    <article className={`${card} p-6`}>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">Try it · fill in the blank</p>
      <form
        className="mt-2"
        onSubmit={(e) => {
          e.preventDefault()
          setResult(value.trim().replace(/\s+/g, ' ').toLowerCase() === 'join')
        }}
      >
        <label htmlFor="sample-blank" className="font-semibold text-ink dark:text-cream">
          In SQL, the keyword that combines rows from two tables is ____.
        </label>
        <div className="mt-4 flex gap-2">
          <input
            id="sample-blank"
            value={value}
            onChange={(e) => {
              setValue(e.target.value)
              setResult(null)
            }}
            autoComplete="off"
            spellCheck={false}
            className="min-w-0 flex-1 rounded-xl border border-sand bg-white px-4 py-2.5 text-ink outline-none focus:border-gold focus:ring-4 focus:ring-gold/15 dark:border-cocoa dark:bg-espresso dark:text-cream"
          />
          <button type="submit" disabled={!value.trim()} className={`${darkPill} disabled:opacity-50`}>
            Check
          </button>
        </div>
      </form>
      <p aria-live="polite" className="mt-3 min-h-5 text-sm text-taupe dark:text-sand/70">
        {result === null ? 'Not case-sensitive.' : result ? 'Correct!' : 'Not quite: the answer is “JOIN”.'}
      </p>
    </article>
  )
}
