'use client'

import * as React from 'react'
import Lenis from 'lenis'
import { getGsap, prefersReducedMotion } from '@/lib/motion/gsap'

export function SmoothScrollProvider({ children }: { children: React.ReactNode }) {
  React.useEffect(() => {
    if (prefersReducedMotion()) return

    const { gsap, ScrollTrigger } = getGsap()
    const lenis = new Lenis({
      autoRaf: false,
      smoothWheel: true,
    })

    lenis.on('scroll', ScrollTrigger.update)

    const tick = (time: number) => {
      lenis.raf(time * 1000)
    }
    gsap.ticker.add(tick)
    gsap.ticker.lagSmoothing(0)

    const onResize = () => {
      ScrollTrigger.refresh()
    }
    window.addEventListener('resize', onResize)

    const onVisibility = () => {
      if (document.hidden) lenis.stop()
      else lenis.start()
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      gsap.ticker.remove(tick)
      window.removeEventListener('resize', onResize)
      document.removeEventListener('visibilitychange', onVisibility)
      lenis.destroy()
    }
  }, [])

  return <>{children}</>
}
