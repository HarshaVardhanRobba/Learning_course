import fs from 'node:fs'
import path from 'node:path'
import Image from 'next/image'
import Link from 'next/link'
import { Icon } from '@iconify/react'
import { SignUpButton } from '@clerk/nextjs'
import { RevealWords } from '@/components/marketing/reveal-text'
import { RevealSection } from '@/components/marketing/reveal-section'
import { HeroVisual } from '@/components/marketing/hero-visual'
import { darkPill, eyebrow, goldText } from '@/lib/styles'

const heroImage = ['hero.jpg', 'hero.webp', 'hero.png'].find((file) =>
  fs.existsSync(path.join(process.cwd(), 'public', file)),
)

const FACTS = [
  { icon: 'solar:layers-minimalistic-linear', value: '8', label: 'Modules per path' },
  { icon: 'solar:user-speak-linear', value: '1:1', label: 'Mentor reviews' },
  { icon: 'solar:global-linear', value: '100%', label: 'Online' },
]

const FEATURES = [
  {
    icon: 'solar:widget-4-linear',
    title: 'Project-based paths',
    body: 'Every path is built around a real deliverable, not a quiz bank — so the skill transfers.',
  },
  {
    icon: 'solar:users-group-rounded-linear',
    title: 'A mentor in your corner',
    body: 'A dedicated expert reviews your work and unblocks you when you get stuck.',
  },
  {
    icon: 'solar:chat-round-dots-linear',
    title: 'An active cohort',
    body: 'Ask questions, share progress, and learn alongside people building the same thing.',
  },
  {
    icon: 'solar:square-academic-cap-linear',
    title: 'Proof you can show',
    body: 'Finish with portfolio-ready projects and a certificate for every completed path.',
  },
]

const STEPS = [
  { index: 'I', title: 'Pick your path', body: 'Tell us where you want to land and we map the shortest honest route there.' },
  { index: 'II', title: 'Build in public', body: 'Ship real projects week by week, reviewed by a mentor who has done the job.' },
  { index: 'III', title: 'Graduate with proof', body: 'Leave with a portfolio, a certificate, and the muscle memory to back it up.' },
]

export default function Page() {
  return (
    <main className="overflow-x-clip">
      <section className="px-4 pt-2 lg:px-6">
        <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[2rem] bg-espresso">
          {heroImage && (
            <div aria-hidden="true" className="absolute inset-y-0 right-0 w-full lg:w-[68%]">
              <Image
                src={`/${heroImage}`}
                alt=""
                fill
                priority
                sizes="(min-width: 1024px) 68vw, 100vw"
                className="object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-espresso via-espresso/80 to-espresso/10 lg:via-espresso/40 lg:to-transparent" />
              <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-espresso/70 to-transparent" />
            </div>
          )}

          <div className="relative grid min-h-[640px] items-center gap-14 px-8 py-16 sm:px-12 lg:grid-cols-[1.05fr_1fr] lg:px-16">
            <div>
              <span className={`${eyebrow} border-white/15 bg-white/5 text-sand/80`}>
                <span className="size-1.5 rounded-full bg-gold" />
                Elevate your learning
              </span>

              <h1 className="mt-6 font-display text-[clamp(3rem,7vw,5.5rem)] font-medium leading-[0.98] tracking-tight text-cream">
                <RevealWords as="span" className="block" text="Learning That" />
                <RevealWords as="span" className="block" wordClassName={goldText} text="Transforms" delay={0.1} />
                <RevealWords as="span" className="block" text="Careers" delay={0.2} />
              </h1>

              <p className="mt-6 max-w-md text-base leading-relaxed text-sand/75">
                Mentor-led, project-based paths that bring focus, craft, and real momentum to
                the way you learn.
              </p>

              <div className="mt-9 flex flex-wrap items-center gap-5">
                <Link
                  href="/career-paths"
                  className="inline-flex items-center gap-2 rounded-full bg-cream px-6 py-3.5 text-sm font-medium text-espresso transition-[background-color,transform] duration-150 ease-out hover:bg-white active:scale-[0.97]"
                >
                  Explore career paths
                  <Icon icon="solar:arrow-right-linear" width={16} />
                </Link>
                <a
                  href="#how-it-works"
                  className="group inline-flex items-center gap-3 text-sm text-sand/85 transition-colors duration-150 hover:text-cream"
                >
                  <span className="grid size-11 place-items-center rounded-full border border-white/25 transition-[border-color,transform] duration-150 ease-out group-hover:border-gold-soft group-active:scale-[0.95]">
                    <Icon icon="solar:play-bold" width={14} />
                  </span>
                  How it works
                </a>
              </div>

              <dl className="mt-12 grid max-w-md grid-cols-3 divide-x divide-white/10 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md">
                {FACTS.map((fact) => (
                  <div key={fact.label} className="flex flex-col items-center px-3 py-4 text-center sm:px-6">
                    <Icon icon={fact.icon} width={20} className="text-gold-soft" />
                    <dt className="order-last text-[11px] text-sand/60">{fact.label}</dt>
                    <dd className="mt-2 text-xl font-semibold tabular-nums text-cream">{fact.value}</dd>
                  </div>
                ))}
              </dl>
            </div>

            {!heroImage && (
              <div className="pb-24 lg:pb-0">
                <HeroVisual />
              </div>
            )}
          </div>
        </div>
      </section>

      <RevealSection className="mx-auto mt-24 grid max-w-7xl grid-cols-1 gap-10 px-6 sm:grid-cols-2 lg:grid-cols-4 lg:px-10">
        {FEATURES.map((feature) => (
          <div key={feature.title} data-reveal className="border-t border-sand pt-6 dark:border-cocoa">
            <Icon icon={feature.icon} width={26} className="text-gold" />
            <h3 className="mt-4 font-display text-2xl font-semibold text-ink dark:text-cream">{feature.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-taupe dark:text-sand/70">{feature.body}</p>
          </div>
        ))}
      </RevealSection>

      <section id="how-it-works" className="mx-auto max-w-7xl scroll-mt-28 px-6 py-28 lg:px-10">
        <div className="mx-auto max-w-2xl text-center">
          <span className={`${eyebrow} border-sand text-taupe dark:border-cocoa dark:text-sand/70`}>
            <span className="size-1.5 rounded-full bg-gold" />
            The method
          </span>
          <h2 className="mt-5 font-display text-5xl font-medium tracking-tight text-ink sm:text-6xl dark:text-cream">
            How a path <span className={goldText}>works</span>
          </h2>
          <p className="mt-4 text-taupe dark:text-sand/70">
            Three steps, no filler — designed to get you to a working project, not just a
            finished video.
          </p>
        </div>

        <RevealSection className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-3">
          {STEPS.map((step) => (
            <div
              key={step.index}
              data-reveal
              className="rounded-[1.75rem] border border-sand bg-white/60 p-8 dark:border-cocoa dark:bg-cocoa/40"
            >
              <span className="font-display text-3xl italic text-gold">{step.index}</span>
              <h3 className="mt-4 font-display text-2xl font-semibold text-ink dark:text-cream">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-taupe dark:text-sand/70">{step.body}</p>
            </div>
          ))}
        </RevealSection>
      </section>

      <section id="about" className="mx-auto max-w-7xl scroll-mt-28 px-4 pb-24 lg:px-6">
        <RevealSection>
          <div
            data-reveal
            className="relative flex flex-col items-center gap-6 overflow-hidden rounded-[2rem] bg-espresso px-8 py-20 text-center"
          >
            <div
              aria-hidden="true"
              className="absolute left-1/2 top-0 h-px w-2/3 -translate-x-1/2 bg-gradient-to-r from-transparent via-gold-soft/60 to-transparent"
            />
            <h2 className="max-w-2xl font-display text-5xl font-medium tracking-tight text-cream sm:text-6xl">
              Your next skill is <span className={goldText}>one path</span> away.
            </h2>
            <p className="max-w-md text-sand/70">
              Join a cohort, get a mentor, ship something real — start today, cancel anytime.
            </p>
            <SignUpButton mode="modal">
              <button className="inline-flex items-center gap-2 rounded-full bg-cream px-7 py-3.5 text-sm font-medium text-espresso transition-[background-color,transform] duration-150 ease-out hover:bg-white active:scale-[0.97]">
                Get started
                <Icon icon="solar:arrow-right-linear" width={16} />
              </button>
            </SignUpButton>
          </div>
        </RevealSection>
      </section>

      <footer id="contact" className="border-t border-sand py-12 dark:border-cocoa">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-6 text-sm text-taupe md:flex-row lg:px-10 dark:text-sand/70">
          <span className="font-display text-2xl font-semibold text-ink dark:text-cream">Arcway</span>
          <p>© {new Date().getFullYear()} Arcway. Built for people who ship.</p>
          <Link href="/career-paths" className={darkPill}>
            Browse career paths
          </Link>
        </div>
      </footer>
    </main>
  )
}
