import { cookies } from 'next/headers'

import { defaultLocale, type Locale, locales } from './dictionaries'

export const LOCALE_COOKIE = 'partey-locale'

export async function getLocale(): Promise<Locale> {
  const store = await cookies()
  const value = store.get(LOCALE_COOKIE)?.value
  return locales.includes(value as Locale) ? (value as Locale) : defaultLocale
}
