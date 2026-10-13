'use client'

import { useEffect } from 'react'

const clamp = (value: number) => Math.min(1, Math.max(0, value))

/**
 * Drives the story from the scroll position, with one listener for the page:
 *
 * - every chapter gets `--p`, its progress from 0 to 1. Tall chapters pin
 *   their stage (position: sticky) and play their animation over that
 *   progress; the CSS reads nothing else.
 * - chapters get `data-seen` once they come into view, for the fade-ins.
 * - <html> gets `data-scene`, which tints the sky.
 *
 * Without JavaScript none of this runs; Story's <noscript> style then shows
 * every scene in its end state, which is the plain readable page.
 */
export function StoryScroll() {
  useEffect(() => {
    const root = document.getElementById('story')
    if (!root) return
    const chapters = Array.from(root.querySelectorAll<HTMLElement>('.story__chapter'))
    const html = document.documentElement

    let frame = 0
    const update = () => {
      frame = 0
      const viewport = window.innerHeight
      let current = chapters[0]

      for (const chapter of chapters) {
        const rect = chapter.getBoundingClientRect()
        const travel = rect.height - viewport
        const progress =
          travel > 1 ? clamp(-rect.top / travel) : clamp((viewport - rect.top) / (viewport + rect.height))
        chapter.style.setProperty('--p', progress.toFixed(4))
        if (rect.top < viewport * 0.8) chapter.dataset.seen = ''
        if (rect.top <= viewport * 0.5) current = chapter
      }

      html.dataset.scene = current?.dataset.scene
    }

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }

    schedule()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      delete html.dataset.scene
    }
  }, [])

  return null
}
