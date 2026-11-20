import { Icon } from '@iconify/react'
import Link from 'next/link'
import { RevealWords } from '@/components/marketing/reveal-text'
import { RevealSection } from '@/components/marketing/reveal-section'
import { darkPill, eyebrow, goldText } from '@/lib/styles'

const CATALOG_FEATURES = [
  { icon: 'solar:widget-4-linear', label: 'Real-world projects' },
  { icon: 'solar:users-group-rounded-linear', label: 'A dedicated mentor' },
  { icon: 'solar:chat-round-dots-linear', label: 'A thriving cohort' },
  { icon: 'solar:square-academic-cap-linear', label: 'Portfolio on graduation' },
]

const CATEGORIES = [
  'Development',
  'Product & Project Management',
  'Data',
  'Marketing & Communication',
  'Business',
  'Design',
]

const SUB_NAV = ['Overview', 'Career paths', 'My roadmap', 'Progress']

type StepStatus = 'completed' | 'available' | 'locked'

const STEPS: { index: string; title: string; body: string; skills: string[]; status: StepStatus }[] = [
  {
    index: '01',
    title: 'Foundations of the web',
    body: 'Get acquainted with the basics and understand how the pieces fit together.',
    skills: ['HTML', 'CSS', 'JavaScript'],
    status: 'completed',
  },
  {
    index: '02',
    title: 'Responsive layout',
    body: 'Build pages that hold up across breakpoints, inputs, and real devices.',
    skills: ['Flexbox', 'Grid', 'Media queries'],
    status: 'completed',
  },
  {
    index: '03',
    title: 'Frontend frameworks',
    body: 'Go deeper into component-driven UI and client-side state.',
    skills: ['React', 'Component design'],
    status: 'available',
  },
  {
    index: '04',
    title: 'Frontend at scale',
    body: 'Architecture, performance, and testing for production frontends.',
    skills: ['React', 'Testing', 'Performance'],
    status: 'locked',
  },
  {
    index: '05',
    title: 'Backend fundamentals',
    body: 'Learn how servers, routing, and APIs actually work.',
    skills: ['Node.js', 'REST APIs'],
    status: 'locked',
  },
  {
    index: '06',
    title: 'Data & persistence',
    body: 'Model, store, and query the data your product depends on.',
    skills: ['SQL', 'Schema design'],
    status: 'locked',
  },
  {
    index: '07',
    title: 'Databases in practice',
    body: 'Indexing, migrations, and the tradeoffs behind real systems.',
    skills: ['Postgres', 'Migrations'],
    status: 'locked',
  },
  {
    index: '08',
    title: 'Full-stack capstone',
    body: 'Ship a complete product end to end, reviewed by a mentor.',
    skills: ['End-to-end project'],
    status: 'locked',
  },
]

const STATUS_ICON: Record<StepStatus, string> = {
  completed: 'solar:check-circle-bold',
  available: 'solar:star-bold',
  locked: 'solar:lock-keyhole-minimalistic-linear',
}

export default function CareerPathsPage() {
  return (
    <main>
      <section className="px-4 pt-2 lg:px-6">
        <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[2rem] bg-espresso px-8 py-16 sm:px-12 lg:px-16 lg:py-20">
          <div
            aria-hidden="true"
            className="absolute -right-24 -top-24 size-[28rem] rounded-full bg-[radial-gradient(closest-side,rgba(227,194,143,0.22),transparent)]"
          />

          <nav aria-label="Breadcrumb" className="relative flex items-center gap-2 text-xs text-sand/60">
            <Link href="/" className="transition-colors duration-150 hover:text-cream">
              Home
            </Link>
            <Icon icon="solar:alt-arrow-right-linear" width={12} />
            <span aria-current="page" className="text-sand/90">
              Career paths
            </span>
          </nav>

          <div className="relative mt-8 max-w-2xl">
            <h1 className="font-display text-[clamp(2.75rem,6vw,4.75rem)] font-medium leading-[1] tracking-tight text-cream">
              <RevealWords as="span" className="block" text="Discover our" />
              <RevealWords as="span" className="block" wordClassName={goldText} text="course catalog" delay={0.08} />
            </h1>
            <p className="mt-6 max-w-md leading-relaxed text-sand/75">
              Learn the most in-demand skills for the jobs of today and tomorrow — project by
              project, with a mentor who has shipped the real thing.
            </p>
          </div>

          <RevealSection className="relative mt-14 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:grid-cols-4">
            {CATALOG_FEATURES.map((feature) => (
              <div
                key={feature.label}
                data-reveal
                className="flex items-center gap-3 bg-espresso/90 px-5 py-4 backdrop-blur-md"
              >
                <Icon icon={feature.icon} width={22} className="shrink-0 text-gold-soft" />
                <span className="text-sm text-sand/85">{feature.label}</span>
              </div>
            ))}
          </RevealSection>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-14 lg:px-10">
        <h2 className="font-display text-3xl font-semibold text-ink dark:text-cream">Explore paths by field</h2>
        <div className="mt-5 flex flex-wrap gap-2.5">
          {CATEGORIES.map((category) => (
            <button
              key={category}
              className="rounded-full border border-sand px-4 py-2 text-sm text-taupe transition-[color,border-color,background-color,transform] duration-150 ease-out hover:border-gold hover:text-ink active:scale-[0.97] dark:border-cocoa dark:text-sand/70 dark:hover:text-cream"
            >
              {category}
            </button>
          ))}
        </div>
      </section>

      <section className="border-t border-sand py-20 dark:border-cocoa">
        <div className="mx-auto max-w-7xl px-6 lg:px-10">
          <div className="flex justify-center">
            <nav
              aria-label="Learning sections"
              className="flex flex-wrap items-center gap-1 rounded-full border border-sand bg-white/60 p-1 text-sm dark:border-cocoa dark:bg-cocoa/40"
            >
              {SUB_NAV.map((item, i) => (
                <span
                  key={item}
                  aria-current={i === 2 ? 'page' : undefined}
                  className={`rounded-full px-4 py-2 ${
                    i === 2 ? 'bg-espresso text-cream dark:bg-cream dark:text-espresso' : 'text-taupe dark:text-sand/70'
                  }`}
                >
                  {item}
                </span>
              ))}
            </nav>
          </div>

          <div className="mt-12 text-center">
            <span className={`${eyebrow} border-sand text-taupe dark:border-cocoa dark:text-sand/70`}>
              <span className="size-1.5 rounded-full bg-gold" />
              Full-stack path
            </span>
            <h2 className="mt-5 font-display text-5xl font-medium tracking-tight text-ink sm:text-6xl dark:text-cream">
              Your learning <span className={goldText}>journey</span>
            </h2>
            <p className="mx-auto mt-4 max-w-md text-taupe dark:text-sand/70">
              Master the full-stack path step by step — each module unlocks once the one
              before it is done.
            </p>
          </div>

          <RevealSection className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step) => {
              const locked = step.status === 'locked'
              return (
                <article
                  key={step.index}
                  data-reveal
                  className={`flex flex-col rounded-[1.5rem] border p-6 ${
                    step.status === 'available'
                      ? 'border-gold/60 bg-espresso text-cream shadow-[0_24px_48px_-24px_rgba(26,21,18,0.6)]'
                      : 'border-sand bg-white/60 dark:border-cocoa dark:bg-cocoa/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`font-display text-lg italic ${step.status === 'available' ? 'text-gold-soft' : 'text-taupe'}`}>
                      /{step.index}
                    </span>
                    <Icon
                      icon={STATUS_ICON[step.status]}
                      width={18}
                      className={locked ? 'text-taupe/60' : 'text-gold'}
                    />
                  </div>

                  <h3
                    className={`mt-4 font-display text-2xl font-semibold leading-tight ${
                      step.status === 'available' ? 'text-cream' : locked ? 'text-ink/60 dark:text-cream/50' : 'text-ink dark:text-cream'
                    }`}
                  >
                    {step.title}
                  </h3>
                  <p
                    className={`mt-2 text-sm leading-relaxed ${
                      step.status === 'available' ? 'text-sand/75' : 'text-taupe dark:text-sand/60'
                    }`}
                  >
                    {step.body}
                  </p>

                  <ul className="mt-4 space-y-1.5">
                    {step.skills.map((skill) => (
                      <li
                        key={skill}
                        className={`flex items-center gap-2 text-xs ${
                          step.status === 'available' ? 'text-sand/80' : 'text-taupe dark:text-sand/60'
                        }`}
                      >
                        <span className="size-1 rounded-full bg-gold" />
                        {skill}
                      </li>
                    ))}
                  </ul>

                  <div className="mt-auto pt-6">
                    {step.status === 'completed' && (
                      <span className="inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-gold/40 py-2.5 text-xs font-medium text-gold">
                        <Icon icon="solar:check-circle-linear" width={14} />
                        Completed
                      </span>
                    )}
                    {step.status === 'available' && (
                      <button className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-cream py-2.5 text-sm font-medium text-espresso transition-[background-color,transform] duration-150 ease-out hover:bg-white active:scale-[0.97]">
                        <Icon icon="solar:play-bold" width={14} />
                        Get started
                      </button>
                    )}
                    {locked && (
                      <span className="inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-sand/50 py-2.5 text-xs font-medium text-taupe dark:bg-cocoa dark:text-sand/50">
                        <Icon icon="solar:lock-keyhole-minimalistic-linear" width={14} />
                        Locked
                      </span>
                    )}
                  </div>
                </article>
              )
            })}
          </RevealSection>

          <div className="mt-14 flex justify-center">
            <Link href="/" className={darkPill}>
              Back to home
              <Icon icon="solar:arrow-right-linear" width={16} />
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
