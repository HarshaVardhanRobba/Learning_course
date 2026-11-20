'use client'

import * as React from 'react'
import { Icon } from '@iconify/react'
import { DURATION, EASE, getGsap, prefersReducedMotion } from '@/lib/client/motion'

const LESSONS = [
  { title: 'Layout fundamentals', state: 'done' },
  { title: 'State and props', state: 'done' },
  { title: 'Data fetching', state: 'current' },
  { title: 'Testing components', state: 'locked' },
] as const

const floatCard =
  'rounded-2xl border border-white/15 bg-white/10 text-cream shadow-[0_16px_40px_-16px_rgba(0,0,0,0.6)] backdrop-blur-md'

export function HeroVisual() {
  const rootRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const root = rootRef.current
    if (!root || prefersReducedMotion()) return

    const { gsap } = getGsap()
    const intro = gsap.timeline({ delay: 0.3 })
    intro
      .fromTo(
        root.querySelector('[data-stage]'),
        { y: 40, opacity: 0 },
        { y: 0, opacity: 1, duration: 1, ease: EASE },
      )
      .fromTo(
        root.querySelectorAll('[data-float]'),
        { y: 14, scale: 0.96, opacity: 0 },
        { y: 0, scale: 1, opacity: 1, duration: DURATION.reveal, ease: EASE, stagger: 0.08 },
        '-=0.55',
      )

    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      return () => {
        intro.kill()
      }
    }

    const movers = Array.from(root.querySelectorAll<HTMLElement>('[data-depth]')).map((el) => ({
      depth: Number(el.dataset.depth),
      x: gsap.quickTo(el, 'x', { duration: DURATION.parallax, ease: EASE }),
      y: gsap.quickTo(el, 'y', { duration: DURATION.parallax, ease: EASE }),
    }))

    let frame = 0
    const onMove = (event: PointerEvent) => {
      if (frame || document.hidden) return
      frame = requestAnimationFrame(() => {
        frame = 0
        const px = event.clientX / window.innerWidth - 0.5
        const py = event.clientY / window.innerHeight - 0.5
        for (const m of movers) {
          m.x(px * m.depth)
          m.y(py * m.depth)
        }
      })
    }
    const reset = () => {
      for (const m of movers) {
        m.x(0)
        m.y(0)
      }
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('blur', reset)
    document.documentElement.addEventListener('pointerleave', reset)

    return () => {
      intro.kill()
      cancelAnimationFrame(frame)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('blur', reset)
      document.documentElement.removeEventListener('pointerleave', reset)
    }
  }, [])

  return (
    <div ref={rootRef} className="relative mx-auto w-full max-w-lg">
      <div
        aria-hidden="true"
        className="absolute left-1/2 top-1/2 size-[110%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(227,194,143,0.35),transparent)]"
      />

      <div data-depth="8" className="relative">
        <div
          data-stage
          className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-cocoa shadow-[0_40px_80px_-30px_rgba(0,0,0,0.7)]"
        >
          <div className="relative grid aspect-[16/10] place-items-center bg-[linear-gradient(135deg,#3a2e25,#1f1915)]">
            <div
              aria-hidden="true"
              className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-gold-soft/70 to-transparent"
            />
            <span className="grid size-16 place-items-center rounded-full bg-gradient-to-br from-gold-soft to-gold text-espresso shadow-[0_0_40px_rgba(227,194,143,0.45)]">
              <Icon icon="solar:play-bold" width={24} />
            </span>
            <p className="absolute bottom-4 left-5 text-xs tracking-wide text-sand/70">
              Frontend Systems · Module 3
            </p>
          </div>

          <div className="p-5">
            <div className="flex items-center justify-between">
              <p className="font-display text-xl font-semibold text-cream">Data fetching patterns</p>
              <span className="text-xs font-medium text-gold-soft">62%</span>
            </div>
            <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/10">
              <div className="h-full w-[62%] rounded-full bg-gradient-to-r from-gold to-gold-soft" />
            </div>
            <ul className="mt-4 space-y-1">
              {LESSONS.map((lesson) => (
                <li
                  key={lesson.title}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm ${
                    lesson.state === 'current' ? 'bg-white/[0.06] text-cream' : 'text-sand/60'
                  }`}
                >
                  <Icon
                    icon={
                      lesson.state === 'done'
                        ? 'solar:check-circle-bold'
                        : lesson.state === 'current'
                          ? 'solar:play-circle-bold'
                          : 'solar:lock-keyhole-minimalistic-linear'
                    }
                    width={18}
                    className={lesson.state === 'locked' ? undefined : 'text-gold-soft'}
                  />
                  {lesson.title}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <FloatCard depth={26} position="-left-10 top-10 hidden sm:block" className="px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="grid size-9 place-items-center rounded-full bg-gold/20 text-gold-soft">
            <Icon icon="solar:letter-bold" width={16} />
          </span>
          <div>
            <p className="text-xs font-semibold">Congratulations!</p>
            <p className="text-[11px] text-sand/70">You hit a new milestone</p>
          </div>
        </div>
      </FloatCard>

      <FloatCard depth={32} position="-right-8 bottom-16 hidden sm:block" className="px-4 py-3">
        <p className="text-[11px] text-sand/70">Your projects done</p>
        <p className="mt-0.5 font-display text-2xl font-semibold text-gold-soft">12</p>
      </FloatCard>
    </div>
  )
}

function FloatCard({
  depth,
  position,
  className,
  children,
}: {
  depth: number
  position: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div data-depth={depth} aria-hidden="true" className={`absolute ${position}`}>
      <div data-float className={`${floatCard} ${className ?? ''}`}>
        {children}
      </div>
    </div>
  )
}
