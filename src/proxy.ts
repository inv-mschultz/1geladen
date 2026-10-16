import { type NextRequest, NextResponse } from 'next/server'

import { locales } from '@/i18n/dictionaries'
import { LOCALE_COOKIE, LOCALE_HEADER } from '@/i18n/locale'

/**
 * `?lang=de|en` picks the language for a link: link previews (which carry no
 * cookies) get the matching title and description, and people who follow the
 * link keep that language afterwards.
 */
export function proxy(request: NextRequest) {
  const lang = request.nextUrl.searchParams.get('lang')
  if (!locales.includes(lang as (typeof locales)[number])) return NextResponse.next()

  const headers = new Headers(request.headers)
  headers.set(LOCALE_HEADER, lang!)
  const response = NextResponse.next({ request: { headers } })
  response.cookies.set(LOCALE_COOKIE, lang!, { path: '/', maxAge: 60 * 60 * 24 * 365 })
  return response
}

export const config = {
  matcher: [{ source: '/((?!api|admin|_next|icons|story).*)', has: [{ type: 'query', key: 'lang' }] }],
}
