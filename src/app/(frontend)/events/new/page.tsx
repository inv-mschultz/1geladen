import config from '@payload-config'
import { headers as getHeaders } from 'next/headers'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'
import React from 'react'

import { canHost } from '@/access'
import { EventForm } from '@/components/EventForm'
import { getDictionary } from '@/i18n/dictionaries'
import { getLocale } from '@/i18n/locale'

export default async function NewEventPage() {
  const locale = await getLocale()
  const dict = getDictionary(locale)

  const payload = await getPayload({ config })
  const headers = await getHeaders()
  const { user } = await payload.auth({ headers })
  if (!user) redirect('/login')
  // Invite-link guests add an email first; the account page says why.
  if (!canHost(user)) redirect('/account')

  return (
    <div className="auth-page reveal">
      <div className="auth-card auth-card--wide">
        <h1 className="auth-card__title">{dict.eventForm.title}</h1>
        <p className="account__intro">{dict.eventForm.intro}</p>
        <EventForm dict={dict.eventForm} />
      </div>
    </div>
  )
}
