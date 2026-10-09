import config from '@payload-config'
import { headers as getHeaders } from 'next/headers'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'
import React from 'react'

import { ClaimForm } from '@/components/ClaimForm'
import { DeleteAccount } from '@/components/DeleteAccount'
import { PushToggle } from '@/components/PushToggle'
import { getDictionary } from '@/i18n/dictionaries'
import { getLocale } from '@/i18n/locale'
import { isSyntheticGuestEmail } from '@/lib/guestAuth'
import { soleHostedEvents } from '@/lib/membership'
import { pushEnabled } from '@/lib/push'

export default async function AccountPage() {
  const locale = await getLocale()
  const dict = getDictionary(locale)

  const payload = await getPayload({ config })
  const headers = await getHeaders()
  const { user } = await payload.auth({ headers })
  if (!user) redirect('/login')

  const soleHosted = await soleHostedEvents(payload, user.id)

  return (
    <div className="auth-page reveal">
      <div className="auth-card">
        <h1 className="auth-card__title">{dict.account.title}</h1>
        <p className="account__intro">{dict.account.intro}</p>
        <ClaimForm
          currentEmail={user.email}
          isSynthetic={isSyntheticGuestEmail(user.email)}
          dict={dict.account}
        />
        {user.guestJoin && <p className="account__hint account__host-hint">{dict.account.hostHint}</p>}
        {pushEnabled && (
          <PushToggle publicKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ''} dict={dict.push} />
        )}
        <DeleteAccount soleHosted={soleHosted.map((event) => event.title)} dict={dict.account} />
      </div>
    </div>
  )
}
