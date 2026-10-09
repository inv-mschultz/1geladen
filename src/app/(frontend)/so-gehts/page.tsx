import config from '@payload-config'
import type { Metadata } from 'next'
import { headers as getHeaders } from 'next/headers'
import Link from 'next/link'
import { getPayload } from 'payload'
import React from 'react'

import { canHost } from '@/access'
import { getDictionary } from '@/i18n/dictionaries'
import { getLocale } from '@/i18n/locale'

export async function generateMetadata(): Promise<Metadata> {
  const dict = getDictionary(await getLocale())
  return { title: dict.about.metaTitle, description: dict.about.blurb }
}

/** What 1geladen is, for people who got a link and wonder — or want to send one. */
export default async function AboutPage() {
  const dict = getDictionary(await getLocale())
  const t = dict.about

  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await getHeaders() })
  // Logged in: straight to creating a party (or the account page, which says
  // why an invite-link guest needs an email first). Logged out: sign up.
  const cta = user
    ? { href: canHost(user) ? '/events/new' : '/account', label: t.ctaHost }
    : { href: '/register', label: t.ctaRegister }

  return (
    <div className="about">
      <section className="landing__poster about__hero reveal">
        <span className="sticker sticker--invite">{t.kicker}</span>
        <h1 className="landing__title">
          {t.title}
          <br />
          <em>{t.titleAccent}</em>
        </h1>
        <p className="landing__blurb">{t.blurb}</p>
      </section>

      <section className="about__block reveal">
        <h2 className="section__title about__heading">{t.stepsTitle}</h2>
        <ol className="about__steps">
          {t.steps.map((step, index) => (
            <li key={step.title} className="about__step">
              <span className="about__step-number" aria-hidden>
                {index + 1}
              </span>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="about__block reveal">
        <h2 className="section__title about__heading">{t.featuresTitle}</h2>
        <ul className="about__features">
          {t.features.map((feature) => (
            <li key={feature.title} className="about__feature">
              <span className="about__feature-emoji" aria-hidden>
                {feature.emoji}
              </span>
              <h3>{feature.title}</h3>
              <p>{feature.text}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="section about__not reveal">
        <h2 className="section__title">{t.notTitle}</h2>
        <ul>
          {t.not.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </section>

      <section className="about__block reveal">
        <h2 className="section__title about__heading">{t.faqTitle}</h2>
        <div className="about__faq">
          {t.faq.map((item) => (
            <details key={item.q} className="about__faq-item">
              <summary>{item.q}</summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="about__cta reveal">
        <h2 className="section__title">{t.ctaTitle}</h2>
        <Link href={cta.href} className="btn btn--big btn--yes">
          {cta.label}
        </Link>
      </section>
    </div>
  )
}
