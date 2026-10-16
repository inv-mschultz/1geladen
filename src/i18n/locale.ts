import { cookies, headers } from 'next/headers'

import { defaultLocale, type Locale, locales } from './dictionaries'

export const LOCALE_COOKIE = 'partey-locale'
/** Set by the proxy when a link carries `?lang=`, so shared links render in their language. */
export const LOCALE_HEADER = 'x-partey-locale'

const isLocale = (value: string | null | undefined): value is Locale => locales.includes(value as Locale)

export async function getLocale(): Promise<Locale> {
  const forced = (await headers()).get(LOCALE_HEADER)
  if (isLocale(forced)) return forced
  const value = (await cookies()).get(LOCALE_COOKIE)?.value
  return isLocale(value) ? value : defaultLocale
}
