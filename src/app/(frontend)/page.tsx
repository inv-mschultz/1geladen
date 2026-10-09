import config from '@payload-config'
import { headers as getHeaders } from 'next/headers'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'
import React from 'react'

import { canHost, hostedEventIdsFor } from '@/access'
import { EventView } from '@/components/EventView'
import { ArrowDown, ArrowRight } from '@/components/icons'
import { getDictionary } from '@/i18n/dictionaries'
import { getLocale } from '@/i18n/locale'
import { getThemeMode, resolveEventTheme } from '@/lib/mode'
import { EVENT_TIMEZONE, isEventPast } from '@/lib/time'
import { themeCss } from '@/lib/theme'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const locale = await getLocale()
  const dict = getDictionary(locale)

  const payload = await getPayload({ config })
  const headers = await getHeaders()
  const { user } = await payload.auth({ headers })

  // Hosts start on their event overview
  if (user && (await hostedEventIdsFor(payload, user)).length > 0) {
    redirect('/events')
  }

  if (!user) {
    return (
      <div className="landing">
        <div className="landing__poster reveal">
          <span className="sticker sticker--invite">{dict.landing.kicker}</span>
          <h1 className="landing__title">
            {dict.landing.tagline}
            <br />
            <em>{dict.landing.taglineAccent}</em>
          </h1>
          <p className="landing__blurb">{dict.landing.blurb}</p>
          <div className="landing__cta">
            <Link href="/register" className="btn btn--big btn--yes">
              {dict.landing.cta}
            </Link>
            <Link href="/login" className="btn btn--big btn--ghost">
              {dict.landing.ctaSecondary}
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const now = new Date()
  // An event stays current until noon the day after, so one that already
  // started is not necessarily over. The cutoff can't be expressed as a plain
  // date comparison, so the query widens by the longest that grace can run —
  // midnight start to noon the next day, 36 hours — and the exact rule is
  // applied below. Without the widening a party in progress vanishes from the
  // "next up" query and reappears under "that was nice", mid-party.
  const GRACE_MS = 36 * 60 * 60 * 1000
  const cutoff = new Date(now.getTime() - GRACE_MS).toISOString()

  const [upcomingDocs, pastDocs] = await Promise.all([
    payload.find({
      collection: 'events',
      where: { date: { greater_than_equal: cutoff } },
      sort: 'date',
      limit: 10,
      locale,
      overrideAccess: false,
      user,
    }),
    payload.find({
      collection: 'events',
      where: { date: { less_than: now.toISOString() } },
      sort: '-date',
      limit: 10,
      locale,
      overrideAccess: false,
      user,
    }),
  ])

  // The two windows overlap by the grace period; the filters are complementary,
  // so an event in progress lands in `upcoming` and nowhere else.
  const upcoming = { docs: upcomingDocs.docs.filter((event) => !isEventPast(event, now)) }
  const past = { docs: pastDocs.docs.filter((event) => isEventPast(event, now)) }

  const featured = upcoming.docs[0] ?? past.docs[0]
  const archive = [...upcoming.docs.slice(1), ...past.docs].filter(
    (event) => event.id !== featured?.id,
  )

  if (!featured) {
    return (
      <div className="empty-state reveal">
        <h1>{dict.home.noEvents}</h1>
        <p>{dict.home.noEventsHint}</p>
        {canHost(user) && (
          <Link href="/events/new" className="btn btn--big btn--yes">
            {dict.home.newEvent}
          </Link>
        )}
      </div>
    )
  }

  const theme = resolveEventTheme(featured, await getThemeMode())

  return (
    <>
      {theme.base && <style>{themeCss(theme.base, theme.accent, theme.light)}</style>}
      <EventView
        event={featured}
        user={user}
        dict={dict}
        locale={locale}
        kicker={
          <p className="home-kicker reveal">
            {upcoming.docs[0] ? dict.home.nextUp : dict.home.lastParty} <ArrowDown />
          </p>
        }
      />

      {archive.length > 0 && (
        <section className="archive">
          <h2 className="section__title">{dict.home.archive}</h2>
          <ul className="archive__list">
            {archive.map((event) => (
              <li key={event.id}>
                <Link href={`/events/${event.slug}`} className="archive__link">
                  <span className="archive__date">
                    {new Intl.DateTimeFormat(locale === 'de' ? 'de-DE' : 'en-GB', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      timeZone: EVENT_TIMEZONE,
                    }).format(new Date(event.date))}
                  </span>
                  <span className="archive__title">{event.title}</span>
                  <ArrowRight />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  )
}
