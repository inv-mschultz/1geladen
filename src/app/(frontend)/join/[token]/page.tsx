import config from '@payload-config'
import { headers as getHeaders } from 'next/headers'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'
import React from 'react'

import { JoinForm } from '@/components/JoinForm'
import { getDictionary } from '@/i18n/dictionaries'
import { getLocale } from '@/i18n/locale'

export const dynamic = 'force-dynamic'

export default async function JoinPage(props: { params: Promise<{ token: string }> }) {
  const { token } = await props.params
  const locale = await getLocale()
  const dict = getDictionary(locale)

  const payload = await getPayload({ config })
  const headers = await getHeaders()
  const { user } = await payload.auth({ headers })
  if (user) redirect('/')

  const { docs } = await payload.find({
    collection: 'events',
    where: { inviteToken: { equals: token } },
    limit: 1,
    locale,
    overrideAccess: true,
  })
  const event = docs[0]

  if (!event) {
    return (
      <div className="empty-state reveal">
        <span className="empty-state__emoji" aria-hidden>
          🫥
        </span>
        <h1>{dict.join.invalidTitle}</h1>
        <p>{dict.join.invalid}</p>
      </div>
    )
  }

  const guests = await payload.find({
    collection: 'users',
    where: { and: [{ guestJoin: { equals: true } }, { role: { equals: 'guest' } }] },
    sort: 'name',
    limit: 100,
    overrideAccess: true,
  })

  const when = new Intl.DateTimeFormat(locale === 'de' ? 'de-DE' : 'en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date(event.date))

  return (
    <div className="landing">
      <div className="landing__poster reveal">
        <span className="sticker sticker--invite">{dict.join.kicker} ✦</span>
        <h1 className="landing__title">{event.title}</h1>
        <p className="landing__blurb">{when}</p>
        <JoinForm
          inviteToken={token}
          guests={guests.docs.map((guest) => ({ id: guest.id, name: guest.name }))}
          dict={dict.join}
        />
      </div>
    </div>
  )
}
