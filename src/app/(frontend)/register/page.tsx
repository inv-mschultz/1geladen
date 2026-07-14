import config from '@payload-config'
import { headers as getHeaders } from 'next/headers'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'
import React from 'react'

import { AuthForm } from '@/components/AuthForm'
import { getDictionary } from '@/i18n/dictionaries'
import { getLocale } from '@/i18n/locale'

export default async function RegisterPage() {
  const locale = await getLocale()
  const dict = getDictionary(locale)

  const payload = await getPayload({ config })
  const headers = await getHeaders()
  const { user } = await payload.auth({ headers })
  if (user) redirect('/')

  return (
    <div className="auth-page reveal">
      <div className="auth-card">
        <h1 className="auth-card__title">{dict.auth.registerTitle}</h1>
        <AuthForm mode="register" dict={dict.auth} />
        <Link href="/login" className="auth-card__switch">
          {dict.auth.toLogin}
        </Link>
      </div>
    </div>
  )
}
