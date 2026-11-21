'use client'

import * as React from 'react'

/** Underlined tab bar below the video, like the reference layout. Panels are server-rendered children. */
export function LessonTabs({ tabs }: { tabs: { id: string; label: string; content: React.ReactNode }[] }) {
  const [active, setActive] = React.useState(tabs[0]?.id)
  const refs = React.useRef<(HTMLButtonElement | null)[]>([])

  const onKeyDown = (event: React.KeyboardEvent, index: number) => {
    const delta = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0
    if (!delta) return
    event.preventDefault()
    const nextIndex = (index + delta + tabs.length) % tabs.length
    setActive(tabs[nextIndex]!.id)
    refs.current[nextIndex]?.focus()
  }

  return (
    <div>
      <div role="tablist" aria-label="Lesson sections" className="flex gap-6 overflow-x-auto border-b border-sand px-4 sm:gap-8 sm:px-10 dark:border-cocoa">
        {tabs.map((tab, i) => {
          const selected = tab.id === active
          return (
            <button
              key={tab.id}
              ref={(el) => {
                refs.current[i] = el
              }}
              role="tab"
              type="button"
              id={`tab-${tab.id}`}
              aria-selected={selected}
              aria-controls={`panel-${tab.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(tab.id)}
              onKeyDown={(e) => onKeyDown(e, i)}
              className={`relative shrink-0 py-4 text-base font-medium transition-colors duration-150 ${
                selected
                  ? 'text-ink after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-ink dark:text-cream dark:after:bg-cream'
                  : 'text-taupe hover:text-ink dark:text-sand/70 dark:hover:text-cream'
              }`}
            >
              {tab.label}
            </button>
          )
        })}
      </div>
      {tabs.map((tab) => (
        <div key={tab.id} role="tabpanel" id={`panel-${tab.id}`} aria-labelledby={`tab-${tab.id}`} hidden={tab.id !== active}>
          {tab.content}
        </div>
      ))}
    </div>
  )
}
