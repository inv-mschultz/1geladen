import config from '@payload-config'
import type { Metadata, Viewport } from 'next'
import { Archivo } from 'next/font/google'
import { headers as getHeaders } from 'next/headers'
import Link from 'next/link'
import { getPayload } from 'payload'
import React from 'react'

import { canHost, hostedEventIdsFor } from '@/access'
import { BRAND_BG, logoSvg } from '@/lib/brand'
import { reportMailto } from '@/lib/legal'
import { getThemeMode } from '@/lib/mode'
import { PLATFORM_ACCENT, PLATFORM_COLOR, themeCss } from '@/lib/theme'

import { HeaderMeasure } from '@/components/HeaderMeasure'
import { InstallHint } from '@/components/InstallHint'
import { LangSwitch } from '@/components/LangSwitch'
import { MainNav } from '@/components/MainNav'
import { ServiceWorker } from '@/components/ServiceWorker'
import { UserMenu } from '@/components/UserMenu'
import { getDictionary } from '@/i18n/dictionaries'
import { getLocale } from '@/i18n/locale'
import './styles.css'

const archivo = Archivo({
  subsets: ['latin'],
  axes: ['wdth'],
  variable: '--font-sans',
})

export const viewport: Viewport = {
  themeColor: BRAND_BG,
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale()
  const dict = getDictionary(locale)
  return {
    title: dict.meta.title,
    description: dict.meta.description,
    applicationName: '1geladen',
    manifest: '/manifest.webmanifest',
    appleWebApp: { capable: true, title: '1geladen', statusBarStyle: 'black' },
    icons: {
      icon: `data:image/svg+xml,${encodeURIComponent(logoSvg())}`,
      apple: '/icons/apple-touch-icon.png',
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
  const mode = (await getThemeMode()) ?? 'dark'
  const hostsAnything = user ? (await hostedEventIdsFor(payload, user)).length > 0 : false

  return (
    <html lang={locale}>
      <body className={archivo.variable}>
        <style>{themeCss(PLATFORM_COLOR, PLATFORM_ACCENT, mode === 'light')}</style>
        <header className="site-header">
          <HeaderMeasure />
          <Link href={hostsAnything ? '/events' : '/'} className="site-logo">
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
                canEnterBackstage={user.role === 'admin'}
                canHost={canHost(user)}
                locale={locale}
                mode={mode}
                labels={{
                  account: dict.nav.account,
                  newEvent: dict.nav.newEvent,
                  admin: dict.nav.admin,
                  language: dict.nav.language,
                  logout: dict.nav.logout,
                  mode: dict.nav.mode,
                  modeDark: dict.nav.modeDark,
                  modeLight: dict.nav.modeLight,
                }}
              />
            ) : (
              <LangSwitch current={locale} />
            )}
          </nav>
        </header>
        <ServiceWorker />
        {user && <InstallHint dict={dict.install} />}
        <main className="site-main">{children}</main>
        <footer className="site-footer">
          <Link href="/impressum">{dict.footer.imprint}</Link>
          <Link href="/datenschutz">{dict.footer.privacy}</Link>
          <a href={reportMailto()}>{dict.footer.report}</a>
        </footer>
      </body>
    </html>
  )
}
