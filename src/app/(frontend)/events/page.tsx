import config from '@payload-config'
import { headers as getHeaders } from 'next/headers'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'
import React from 'react'

import { getDictionary, type Dictionary, type Locale } from '@/i18n/dictionaries'
import { getLocale } from '@/i18n/locale'
import type { Event } from '@/payload-types'

export const dynamic = 'force-dynamic'

/** Plain-text excerpt from a lexical rich-text value. */
function excerpt(description: Event['description'], max = 140): string {
  if (!description?.root) return ''
  const texts: string[] = []
  const walk = (node: { text?: string; children?: unknown[] }) => {
    if (typeof node.text === 'string') texts.push(node.text)
    if (Array.isArray(node.children)) node.children.forEach((child) => walk(child as never))
  }
  walk(description.root as never)
  const joined = texts.join(' ').replace(/\s+/g, ' ').trim()
  return joined.length > max ? `${joined.slice(0, max).trimEnd()}…` : joined
}

function EventCard({
  event,
  yesCount,
  countdown,
  locale,
  dict,
}: {
  event: Event
  yesCount: number
  countdown?: string
  locale: Locale
  dict: Dictionary
}) {
  const intlLocale = locale === 'de' ? 'de-DE' : 'en-GB'
  const date = new Date(event.date)
  const fmt = (options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(intlLocale, options).format(date)

  const guestCount = event.members?.length ?? 0
  const what = excerpt(event.description)
  const location = event.location

  return (
    <li>
      <Link href={`/events/${event.slug}`} className="event-card">
        <div className="event-card__head">
          <div className="event-card__cal" aria-hidden>
            <span className="event-card__cal-weekday">{fmt({ weekday: 'short' })}</span>
            <span className="event-card__cal-day">{fmt({ day: '2-digit' })}</span>
            <span className="event-card__cal-month">{fmt({ month: 'short' })}</span>
          </div>
          <h2 className="event-card__title">{event.title}</h2>
        </div>

        <dl className="event-card__facts">
          <div>
            <dt>{dict.hero.when}</dt>
            <dd>
              {fmt({ weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              <span className="event-card__sub">
                {fmt({ hour: '2-digit', minute: '2-digit' })}
                {locale === 'de' ? ' Uhr' : ''}
              </span>
            </dd>
          </div>
          {(location?.name || location?.city) && (
            <div>
              <dt>{dict.hero.where}</dt>
              <dd>
                {location?.name}
                {location?.city && <span className="event-card__sub">{location.city}</span>}
              </dd>
            </div>
          )}
        </dl>

        {what && <p className="event-card__excerpt">{what}</p>}

        <div className="event-card__footer">
          {countdown && <span className="chip chip--count">{countdown}</span>}
          <span className="chip">
            {yesCount} {dict.rsvp.attending}
          </span>
          <span className="chip">
            {guestCount} {guestCount === 1 ? dict.events.guest : dict.events.guests}
          </span>
        </div>
      </Link>
    </li>
  )
}

export default async function EventsOverviewPage() {
  const locale = await getLocale()
  const dict = getDictionary(locale)

  const payload = await getPayload({ config })
  const headers = await getHeaders()
  const { user } = await payload.auth({ headers })
  if (!user) redirect('/login')

  const { docs: events } = await payload.find({
    collection: 'events',
    sort: 'date',
    limit: 100,
    locale,
    overrideAccess: false,
    user,
  })

  const yesCounts = new Map<number, number>()
  if (events.length > 0) {
    const rsvps = await payload.find({
      collection: 'rsvps',
      where: {
        and: [{ event: { in: events.map((event) => event.id) } }, { status: { equals: 'yes' } }],
      },
      limit: 1000,
      depth: 0,
      overrideAccess: false,
      user,
    })
    for (const rsvp of rsvps.docs) {
      const id = typeof rsvp.event === 'object' ? rsvp.event.id : rsvp.event
      yesCounts.set(id, (yesCounts.get(id) ?? 0) + 1)
    }
  }

  const now = Date.now()
  const isPast = (event: Event) =>
    new Date(event.endDate ?? event.date).getTime() < now
  const upcoming = events.filter((event) => !isPast(event))
  const past = events.filter(isPast).reverse()

  const startOfDay = (date: Date) =>
    new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
  const countdown = (event: Event): string | undefined => {
    const days = Math.round((startOfDay(new Date(event.date)) - startOfDay(new Date())) / 86400000)
    if (days < 0) return undefined
    if (days === 0) return dict.events.countToday
    if (days === 1) return dict.events.countTomorrow
    return dict.events.countInDays.replace('{n}', String(days))
  }

  const grid = (list: Event[], withCountdown = false) => (
    <ul className="events-grid">
      {list.map((event) => (
        <EventCard
          key={event.id}
          event={event}
          yesCount={yesCounts.get(event.id) ?? 0}
          countdown={withCountdown ? countdown(event) : undefined}
          locale={locale}
          dict={dict}
        />
      ))}
    </ul>
  )

  return (
    <div className="events-page reveal">
      <div className="events-page__head">
        <h1 className="events-page__title">{dict.events.title}</h1>
        {user.role === 'admin' && (
          <Link href="/events/new" className="btn">
            + {dict.events.new}
          </Link>
        )}
      </div>

      {events.length === 0 && <p className="section__empty">{dict.events.empty}</p>}

      {upcoming.length > 0 && (
        <>
          <h2 className="events-page__section">{dict.events.upcoming}</h2>
          {grid(upcoming, true)}
        </>
      )}

      {past.length > 0 && (
        <>
          <h2 className="events-page__section">{dict.events.past}</h2>
          {grid(past)}
        </>
      )}
    </div>
  )
}
