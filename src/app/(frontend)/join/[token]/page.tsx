import config from '@payload-config'
import { headers as getHeaders } from 'next/headers'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'
import React from 'react'

import { JoinForm } from '@/components/JoinForm'
import { getDictionary } from '@/i18n/dictionaries'
import { getLocale } from '@/i18n/locale'
import { addEventMember } from '@/lib/membership'
import { getThemeMode, resolveEventTheme } from '@/lib/mode'
import { themeCss } from '@/lib/theme'

export const dynamic = 'force-dynamic'

export default async function JoinPage(props: { params: Promise<{ token: string }> }) {
  const { token } = await props.params
  const locale = await getLocale()
  const dict = getDictionary(locale)

  const payload = await getPayload({ config })
  const headers = await getHeaders()
  const { user } = await payload.auth({ headers })

  const { docs } = await payload.find({
    collection: 'events',
    where: { inviteToken: { equals: token } },
    limit: 1,
    locale,
    overrideAccess: true,
  })
  const event = docs[0]

  if (!event) {
    if (user) redirect('/')
    return (
      <div className="empty-state reveal">
        <h1>{dict.join.invalidTitle}</h1>
        <p>{dict.join.invalid}</p>
      </div>
    )
  }

  // Already have an account? The invite link simply puts you on the guest list.
  if (user) {
    await addEventMember(payload, event, user.id)
    redirect(event.slug ? `/events/${event.slug}` : '/')
  }

  const when = new Intl.DateTimeFormat(locale === 'de' ? 'de-DE' : 'en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date(event.date))

  const theme = resolveEventTheme(event, await getThemeMode())

  return (
    <div className="landing">
      {theme.base && <style>{themeCss(theme.base, theme.accent, theme.light)}</style>}
      <div className="landing__poster reveal">
        <span className="sticker sticker--invite">{dict.join.kicker}</span>
        <h1 className="landing__title">{event.title}</h1>
        <p className="landing__blurb">{when}</p>
        <JoinForm inviteToken={token} dict={dict.join} />
        <p className="join-form__login">
          <Link href={`/login?next=/join/${token}`}>{dict.join.haveAccount}</Link>
        </p>
      </div>
    </div>
  )
}
