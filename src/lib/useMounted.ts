'use client'

import { useSyncExternalStore } from 'react'

const subscribe = () => () => {}

/**
 * False during SSR and the first client render, true afterwards — the guard
 * portals need so server and client markup match before `document` is touched.
 *
 * Implemented with useSyncExternalStore rather than the older
 * `useState(false)` + `useEffect(() => setMounted(true))` pair, which sets
 * state synchronously inside an effect and triggers a cascading re-render.
 */
export function useMounted(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true, // client
    () => false, // server snapshot
  )
}
