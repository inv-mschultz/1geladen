import config from '@payload-config'
import { headers as getHeaders } from 'next/headers'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'
import React from 'react'

import { AuthForm } from '@/components/AuthForm'
import { getDictionary } from '@/i18n/dictionaries'
import { getLocale } from '@/i18n/locale'

export default async function LoginPage(props: {
  searchParams: Promise<{ next?: string }>
}) {
  const { next } = await props.searchParams
  const target = next && next.startsWith('/') && !next.startsWith('//') ? next : '/'

  const locale = await getLocale()
  const dict = getDictionary(locale)

  const payload = await getPayload({ config })
  const headers = await getHeaders()
  const { user } = await payload.auth({ headers })
  if (user) redirect(target)

  return (
    <div className="auth-page reveal">
      <div className="auth-card">
        <h1 className="auth-card__title">{dict.auth.loginTitle}</h1>
        <AuthForm mode="login" dict={dict.auth} next={target} />
        <Link href="/register" className="auth-card__switch">
          {dict.auth.toRegister}
        </Link>
      </div>
    </div>
  )
}
