import { cookies } from 'next/headers'

import type { Event } from '@/payload-types'

export const MODE_COOKIE = '1geladen-mode'

export type ThemeMode = 'dark' | 'light'

/** The viewer's chosen theme mode, or null if they never picked one. */
export async function getThemeMode(): Promise<ThemeMode | null> {
  const store = await cookies()
  const value = store.get(MODE_COOKIE)?.value
  return value === 'light' || value === 'dark' ? value : null
}

/**
 * Resolves the polarity and accent for an event: the viewer's mode choice
 * wins; without one the event's own default (invertTheme) applies. Light
 * mode uses the event's light accent when set, falling back to the dark one.
 */
export function resolveEventTheme(
  event: Pick<Event, 'themeColor' | 'accentColor' | 'accentColorLight' | 'invertTheme'>,
  mode: ThemeMode | null,
): { base: string | null; accent: string | null; light: boolean } {
  const light = mode ? mode === 'light' : Boolean(event.invertTheme)
  const accent = (light ? event.accentColorLight || event.accentColor : event.accentColor) ?? null
  return { base: event.themeColor ?? null, accent, light }
}
