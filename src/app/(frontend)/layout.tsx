import config from '@payload-config'
import type { Metadata } from 'next'
import { Fraunces, Instrument_Sans } from 'next/font/google'
import { headers as getHeaders } from 'next/headers'
import Link from 'next/link'
import { getPayload } from 'payload'
import React from 'react'

import { LangSwitch } from '@/components/LangSwitch'
import { MainNav } from '@/components/MainNav'
import { UserMenu } from '@/components/UserMenu'
import { getDictionary } from '@/i18n/dictionaries'
import { getLocale } from '@/i18n/locale'
import './styles.css'

const fraunces = Fraunces({
  subsets: ['latin'],
  axes: ['SOFT', 'WONK', 'opsz'],
  variable: '--font-display',
})

const instrumentSans = Instrument_Sans({
  subsets: ['latin'],
  variable: '--font-body',
})

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale()
  const dict = getDictionary(locale)
  return {
    title: dict.meta.title,
    description: dict.meta.description,
    icons: {
      icon: `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🎉</text></svg>')}`,
    },
  }
}

export default async function FrontendLayout(props: { children: React.ReactNode }) {
  const { children } = props
  const locale = await getLocale()
  const dict = getDictionary(locale)

  const payload = await getPayload({ config })
  const headers = await getHeaders()
  const { user } = await payload.auth({ headers })

  return (
    <html lang={locale}>
      <body className={`${fraunces.variable} ${instrumentSans.variable}`}>
        <div className="grain" aria-hidden />
        <header className="site-header">
          <Link href={user?.role === 'admin' ? '/events' : '/'} className="site-logo">
            <span className="site-logo__one">1</span>geladen
          </Link>
          {user && (
            <MainNav
              labels={{
                info: dict.nav.info,
                mitbringen: dict.nav.bring,
                pinnwand: dict.nav.wall,
                fotos: dict.nav.photos,
              }}
            />
          )}
          <nav className="site-nav">
            {user ? (
              <UserMenu
                name={user.name}
                isAdmin={user.role === 'admin'}
                locale={locale}
                labels={{
                  account: dict.nav.account,
                  admin: dict.nav.admin,
                  language: dict.nav.language,
                  logout: dict.nav.logout,
                }}
              />
            ) : (
              <>
                <LangSwitch current={locale} />
                <Link href="/login" className="btn btn--ghost btn--small">
                  {dict.nav.login}
                </Link>
                <Link href="/register" className="btn btn--small">
                  {dict.nav.register}
                </Link>
              </>
            )}
          </nav>
        </header>
        <main className="site-main">{children}</main>
      </body>
    </html>
  )
}
