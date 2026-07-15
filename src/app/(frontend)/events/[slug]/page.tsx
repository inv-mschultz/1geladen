import config from '@payload-config'
import { headers as getHeaders } from 'next/headers'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { getPayload } from 'payload'
import React from 'react'

import { EventView } from '@/components/EventView'
import { ArrowLeft } from '@/components/icons'
import { getDictionary } from '@/i18n/dictionaries'
import { getLocale } from '@/i18n/locale'
import { themeCss } from '@/lib/theme'

export const dynamic = 'force-dynamic'

export default async function EventPage(props: { params: Promise<{ slug: string }> }) {
  const { slug } = await props.params
  const locale = await getLocale()
  const dict = getDictionary(locale)

  const payload = await getPayload({ config })
  const headers = await getHeaders()
  const { user } = await payload.auth({ headers })

  if (!user) {
    redirect('/login')
  }

  const result = await payload.find({
    collection: 'events',
    where: { slug: { equals: slug } },
    limit: 1,
    locale,
    overrideAccess: false,
    user,
  })

  const event = result.docs[0]
  if (!event) {
    notFound()
  }

  return (
    <>
      {event.themeColor && <style>{themeCss(event.themeColor, event.accentColor)}</style>}
      <p className="home-kicker reveal">
        <Link href="/">
          <ArrowLeft /> 1geladen
        </Link>
      </p>
      <EventView event={event} user={user} dict={dict} locale={locale} />
    </>
  )
}
