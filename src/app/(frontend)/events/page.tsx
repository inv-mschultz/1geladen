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

const ACCENTS = ['var(--tomato)', 'var(--mustard)', 'var(--olive)', 'var(--plum)']

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
  accent,
  locale,
  dict,
}: {
  event: Event
  yesCount: number
  accent: string
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
      <Link
        href={`/events/${event.slug}`}
        className="event-card"
        style={{ ['--accent' as string]: accent }}
      >
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
          {(location?.name || location?.address) && (
            <div>
              <dt>{dict.hero.where}</dt>
              <dd>
                {location?.name}
                {location?.address && <span className="event-card__sub">{location.address}</span>}
              </dd>
            </div>
          )}
        </dl>

        {what && <p className="event-card__excerpt">{what}</p>}

        <div className="event-card__footer">
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

  const grid = (list: Event[], offset = 0) => (
    <ul className="events-grid">
      {list.map((event, index) => (
        <EventCard
          key={event.id}
          event={event}
          yesCount={yesCounts.get(event.id) ?? 0}
          accent={ACCENTS[(index + offset) % ACCENTS.length]}
          locale={locale}
          dict={dict}
        />
      ))}
    </ul>
  )

  return (
    <div className="events-page reveal">
      <h1 className="events-page__title">{dict.events.title}</h1>

      {events.length === 0 && <p className="section__empty">{dict.events.empty}</p>}

      {upcoming.length > 0 && (
        <>
          <h2 className="events-page__section">{dict.events.upcoming}</h2>
          {grid(upcoming)}
        </>
      )}

      {past.length > 0 && (
        <>
          <h2 className="events-page__section">{dict.events.past}</h2>
          {grid(past, upcoming.length)}
        </>
      )}
    </div>
  )
}
