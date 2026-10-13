import Link from 'next/link'
import React from 'react'

import { canHost } from '@/access'
import { ArrowRight } from '@/components/icons'
import type { Dictionary } from '@/i18n/dictionaries'
import type { StoryCopy } from '@/i18n/story'
import type { User } from '@/payload-types'
import { reportMailto } from '@/lib/legal'

import { DotField } from './DotField'
import { EventDemo } from './EventDemo'
import { Faq } from './Faq'
import { SceneCanvas } from './SceneCanvas'
import { StoryScroll } from './StoryScroll'
import { Thread } from './Thread'
import './story.css'

/** Where the calls to action lead: sign up, start a party, or add an email first. */
export type StoryCta = { href: string; label: string; login: boolean }

/**
 * Logged out: sign up (and a way to log in). Logged in: straight to creating
 * a party — or to the account page, which explains why an invite-link guest
 * needs an email first.
 */
export const storyCta = (user: User | null, t: StoryCopy): StoryCta =>
  user
    ? { href: canHost(user) ? '/events/new' : '/account', label: t.close.ctaHost, login: false }
    : { href: '/register', label: t.close.ctaRegister, login: true }

/** Fake gallery: each "photo" is a gradient and an emoji, so the page ships no images. */
const PHOTOS = [
  { emoji: '🪩', from: '#ff8ad4', to: '#6b2fd6' },
  { emoji: '🎂', from: '#ffd36e', to: '#ff6f61' },
  { emoji: '🕺', from: '#4ce6a5', to: '#1b6f8a' },
  { emoji: '💃', from: '#ff6f9f', to: '#ffb36b' },
  { emoji: '🫣', from: '#8ad8ff', to: '#4c5be6' },
  { emoji: '📸', from: '#c6f26b', to: '#2e7d58' },
  { emoji: '🍕', from: '#ffb36b', to: '#d6452f' },
  { emoji: '🎊', from: '#ff8ad4', to: '#ffd36e' },
  { emoji: '🫶', from: '#ff8ad4', to: '#4ce6a5' },
]

const NO_SCRIPT_CSS =
  '.story__chapter{--p:1!important}.story__chapter--tall{height:auto!important}' +
  '.story__stage{position:relative!important;height:auto!important;min-height:100svh}' +
  '.story__reveal{opacity:1!important;transform:none!important}'

/** The phase name above a chapter's title. */
const Kicker = ({ kicker }: { kicker: string }) => <p className="story__kicker">{kicker}</p>

const Copy = ({ kicker, title, text }: { kicker: string; title: string; text: string }) => (
  <div className="story__copy story__reveal">
    <Kicker kicker={kicker} />
    <h2 className="story__title">{title}</h2>
    <p className="story__text">{text}</p>
  </div>
)

const Photo = ({ index, caption }: { index: number; caption: string }) => {
  const photo = PHOTOS[index % PHOTOS.length]
  return (
    <figure
      className="story-photo"
      style={{ '--i': index, '--from': photo.from, '--to': photo.to } as React.CSSProperties}
    >
      <span className="story-photo__image" aria-hidden>
        {photo.emoji}
      </span>
      <figcaption>{caption}</figcaption>
    </figure>
  )
}

/**
 * The landing page as a party seen from a guest's side: the invitation
 * arrives, you answer, the planning happens, and afterwards there are photos.
 * Each chapter shows the feature that matters at that point.
 *
 * Everything here is real HTML text — the animations only move it around —
 * so it reads fine without JavaScript, with reduced motion, and to a screen
 * reader. StoryScroll is the only thing that watches the scroll position.
 */
export function Story({
  t,
  footer,
  cta,
}: {
  t: StoryCopy
  footer: Dictionary['footer']
  cta: StoryCta
}) {
  return (
    <div className="story" id="story" data-header-rest>
      <div className="story__sky" aria-hidden />
      <DotField twinkle fromY={0.45} className="story__dots" />
      {/* Without JavaScript nothing tracks the scroll: show every scene finished. */}
      <noscript>
        <style>{NO_SCRIPT_CSS}</style>
      </noscript>
      <StoryScroll />

      {/* The invitation */}
      <section className="story__chapter story__chapter--tall story-invite" data-scene="invite">
        <span className="story__snap" style={{ '--at': 0.72 } as React.CSSProperties} aria-hidden />
        <div className="story__stage">
          <SceneCanvas
            scene="invite"
            text={{
              kicker: t.invite.kicker,
              title: t.invite.title,
              titleAccent: t.invite.titleAccent,
              to: t.invite.to,
              from: t.invite.from,
            }}
          />
          <p className="story-invite__headline" aria-hidden>
            {t.invite.headline}
          </p>
          <div className="story-invite__envelope">
            <div className="story-invite__flap-open" aria-hidden />
            <div className="story-invite__back" aria-hidden />
            <div className="story-invite__slot">
              <div className="story-invite__card">
                <span className="sticker sticker--invite">{t.invite.kicker}</span>
                <h1 className="story-invite__title">
                  {t.invite.title}
                  <br />
                  <em>{t.invite.titleAccent}</em>
                </h1>
                <p className="story-invite__blurb">{t.invite.blurb}</p>
                <div className="story-invite__cta">
                  <Link href={cta.href} className="btn btn--big btn--yes">
                    {cta.login ? t.invite.cta : cta.label}
                  </Link>
                </div>
              </div>
            </div>
            <div className="story-invite__front" aria-hidden>
              <span className="story-invite__stamp">
                <span className="px-sparkle" />
              </span>
              <span className="story-invite__address">
                <span>{t.invite.to}</span>
                <span>{t.invite.from}</span>
              </span>
            </div>
            <div className="story-invite__flap" aria-hidden />
            <span className="story-invite__seal" aria-hidden>
              <span className="px-sparkle" />
            </span>
          </div>
          <p className="story-invite__hint" aria-hidden>
            {t.invite.hint} <span className="story-invite__arrow">↓</span>
          </p>
        </div>
      </section>

      {/* Answering and planning, on one pretend event page */}
      {/* The heading comes first, big and centred; the event card rises in
          from below and the heading makes room for it. */}
      <section className="story__chapter story__chapter--tall story-plan" data-scene="rsvp">
        <span className="story__snap" style={{ '--at': 0.6 } as React.CSSProperties} aria-hidden />
        <div className="story__stage">
          <div className="story-plan__copy">
            <Kicker kicker={t.plan.kicker} />
            <h2 className="story__title">{t.plan.title}</h2>
            <p className="story__text">{t.plan.text}</p>
          </div>
          <div className="story-plan__card">
            <EventDemo rsvp={t.rsvp} bring={t.kitchen} />
          </div>
        </div>
      </section>

      {/* The run-up: the phone keeps buzzing */}
      <section className="story__chapter story__chapter--tall story-notify" data-scene="notify">
        <span className="story__snap" style={{ '--at': 0.75 } as React.CSSProperties} aria-hidden />
        <div className="story__stage story__split">
          <Copy {...t.notify} />
          <div className="story__prop">
            <div className="story-phone">
              <div className="story-phone__screen">
                <p className="story-phone__time" aria-hidden>
                  {t.notify.lockTime}
                </p>
                <p className="story-phone__date" aria-hidden>
                  {t.notify.lockDate}
                </p>
                <ul className="story-phone__notes">
                  {t.notify.notes.map((note, index) => (
                    <li key={note.title} className="story-note" style={{ '--n': index } as React.CSSProperties}>
                      <span className="story-note__icon" aria-hidden>
                        <span className="px-sparkle" />
                      </span>
                      <span className="story-note__body">
                        <span className="story-note__meta">
                          <span>{t.notify.app}</span>
                          <span>{t.notify.now}</span>
                        </span>
                        <strong>{note.title}</strong>
                        <span>{note.body}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The wall: a thread that builds itself as you scroll */}
      <section className="story__chapter story__chapter--tall story-wall" data-scene="wall">
        <span className="story__snap" style={{ '--at': 0.8 } as React.CSSProperties} aria-hidden />
        <div className="story__stage story__split">
          <Copy {...t.wall} />
          <div className="story__prop">
            <Thread t={t.wall} />
          </div>
        </div>
      </section>

      {/* Afterwards: the gallery, and the photos fading */}
      <section className="story__chapter story__chapter--tall story-late" data-scene="late">
        <div className="story__stage story__split">
          <Copy {...t.late} />
          <div className="story__prop">
            <div className="story-late__strip">
              {t.late.captions.map((caption, index) => (
                <Photo key={caption} index={index} caption={caption} />
              ))}
            </div>
            <p className="story-late__day" aria-hidden>
              {t.late.day.split('{n}')[0]}
              <span className="story-late__counter" />
              {t.late.day.split('{n}')[1]}
            </p>
          </div>
        </div>
      </section>

      {/* FAQ: sticky notes */}
      <section className="story__chapter story-faq" data-scene="faq">
        <div className="story-faq__intro story__reveal">
          <Kicker kicker={t.faq.kicker} />
          <h2 className="story__title">{t.faq.title}</h2>
          <p className="story__text">{t.faq.text}</p>
        </div>
        <Faq t={t.faq} />
      </section>

      {/* The close: one screen, under a disco ball */}
      <section className="story__chapter story-close" data-scene="close">
        <DotField className="story-close__dots" />
        <div className="story-close__ball" aria-hidden>
          <SceneCanvas scene="disco" />
        </div>
        <div className="story-close__cta story__reveal">
          <h2 className="story-close__title">{t.close.title}</h2>
          <div className="story-invite__cta">
            <Link href={cta.href} className="btn btn--big btn--yes">
              {cta.label} <ArrowRight />
            </Link>
            {cta.login && (
              <Link href="/login" className="btn btn--big btn--ghost">
                {t.close.login}
              </Link>
            )}
          </div>
        </div>
        <nav className="story-close__legal">
          <Link href="/impressum">{footer.imprint}</Link>
          <Link href="/datenschutz">{footer.privacy}</Link>
          <a href={reportMailto()}>{footer.report}</a>
        </nav>
      </section>
    </div>
  )
}
