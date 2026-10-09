'use client'

import { useEffect } from 'react'

/** Registers /sw.js (offline page + push). Renders nothing. */
export function ServiceWorker() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // No worker means no offline page and no push — the site works regardless.
    })
  }, [])
  return null
}
