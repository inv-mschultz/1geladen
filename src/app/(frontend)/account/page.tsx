import config from '@payload-config'
import { headers as getHeaders } from 'next/headers'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'
import React from 'react'

import { ClaimForm } from '@/components/ClaimForm'
import { getDictionary } from '@/i18n/dictionaries'
import { getLocale } from '@/i18n/locale'
import { isSyntheticGuestEmail } from '@/lib/guestAuth'

export default async function AccountPage() {
  const locale = await getLocale()
  const dict = getDictionary(locale)

  const payload = await getPayload({ config })
  const headers = await getHeaders()
  const { user } = await payload.auth({ headers })
  if (!user) redirect('/login')

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
      </div>
    </div>
  )
}
