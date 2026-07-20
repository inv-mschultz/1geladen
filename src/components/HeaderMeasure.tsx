'use client'

import { useEffect } from 'react'

// The sticky header's height depends on how its rows wrap, so sticky elements
// that pin below it (RSVP nudge bar) read it from --header-h instead of a constant.
export function HeaderMeasure() {
  useEffect(() => {
    const header = document.querySelector<HTMLElement>('.site-header')
    if (!header) return
    const apply = () =>
      document.documentElement.style.setProperty('--header-h', `${header.offsetHeight}px`)
    apply()
    const observer = new ResizeObserver(apply)
    observer.observe(header)
    return () => observer.disconnect()
  }, [])
  return null
}
