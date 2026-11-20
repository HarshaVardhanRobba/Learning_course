import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

export const EASE = 'power3.out'

export const DURATION = {
  reveal: 0.7,
  hero: 0.8,
  parallax: 0.6,
} as const

let registered = false

export function getGsap() {
  if (!registered && typeof window !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger)
    registered = true
  }
  return { gsap, ScrollTrigger }
}

export function prefersReducedMotion() {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}
