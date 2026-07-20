import { RichText } from '@payloadcms/richtext-lexical/react'
import config from '@payload-config'
import { getPayload } from 'payload'
import React from 'react'

import type { Dictionary, Locale } from '@/i18n/dictionaries'
import type { Event, Media, User } from '@/payload-types'
import { getThemeMode } from '@/lib/mode'
import { richTextToPlain } from '@/lib/richtext'
import { EVENT_TIMEZONE } from '@/lib/time'
import { getViewAsGuest } from '@/lib/viewas'
import { AdminDock } from './AdminDock'
import { BringList, type BringListItem } from './BringList'
import { ArrowDown, ArrowUpRight } from './icons'
import { InviteLink } from './InviteLink'
import { Gallery, type GalleryPhoto } from './Gallery'
import { Rsvp, type RsvpEntry } from './Rsvp'
import { Wall, type WallPost } from './Wall'

const asUser = (value: number | User | null | undefined): User | null =>
  typeof value === 'object' && value !== null ? value : null

const asMedia = (value: number | Media | null | undefined): Media | null =>
  typeof value === 'object' && value !== null ? value : null

function formatEventDate(date: string, locale: Locale): { full: string; time: string; day: string; month: string; weekday: string } {
  const d = new Date(date)
  const intlLocale = locale === 'de' ? 'de-DE' : 'en-GB'
  const timeZone = EVENT_TIMEZONE
  const full = new Intl.DateTimeFormat(intlLocale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone,
  }).format(d)
  const time =
    new Intl.DateTimeFormat(intlLocale, { hour: '2-digit', minute: '2-digit', timeZone }).format(d) +
    (locale === 'de' ? ' Uhr' : '')
  const day = new Intl.DateTimeFormat(intlLocale, { day: '2-digit', timeZone }).format(d)
  const month = new Intl.DateTimeFormat(intlLocale, { month: 'short', timeZone }).format(d)
  const weekday = new Intl.DateTimeFormat(intlLocale, { weekday: 'short', timeZone }).format(d)
  return { full, time, day, month, weekday }
}

export async function EventView({
  event,
  user,
  dict,
  locale,
  kicker,
}: {
  event: Event
  user: User
  dict: Dictionary
  locale: Locale
  kicker?: React.ReactNode
}) {
  const payload = await getPayload({ config })

  // Admins can preview the event as a regular invited guest (bugfixing tool).
  const isRealAdmin = user.role === 'admin'
  const viewAsGuest = isRealAdmin && (await getViewAsGuest())
  const isAdmin = isRealAdmin && !viewAsGuest

  const [rsvps, posts, comments, items, photos] = await Promise.all([
    payload.find({
      collection: 'rsvps',
      where: { event: { equals: event.id } },
      depth: 1,
      limit: 200,
      overrideAccess: false,
      user,
    }),
    payload.find({
      collection: 'posts',
      where: isAdmin
        ? { event: { equals: event.id } }
        : { and: [{ event: { equals: event.id } }, { deleted: { not_equals: true } }] },
      sort: '-createdAt',
      depth: 1,
      limit: 200,
      overrideAccess: false,
      user,
    }),
    payload.find({
      collection: 'comments',
      where: { 'post.event': { equals: event.id } },
      sort: 'createdAt',
      depth: 1,
      limit: 500,
      overrideAccess: false,
      user,
    }),
    payload.find({
      collection: 'bring-items',
      where: { event: { equals: event.id } },
      sort: 'createdAt',
      depth: 1,
      limit: 200,
      overrideAccess: false,
      user,
    }),
    payload.find({
      collection: 'media',
      where: { event: { equals: event.id } },
      sort: '-createdAt',
      depth: 1,
      limit: 500,
      overrideAccess: false,
      user,
    }),
  ])

  const now = new Date()
  const eventStart = new Date(event.date)
  const eventEnd = event.endDate ? new Date(event.endDate) : null
  const isPast = (eventEnd ?? eventStart).getTime() < now.getTime()
  const photosUnlocked = Boolean(event.photosOpen) || isPast

  // The host is always in — their RSVP is implicit and can't be taken back.
  const host = asUser(event.createdBy)
  const viewerIsHost = host?.id === user.id

  const rsvpEntries: Record<'yes' | 'maybe' | 'no', RsvpEntry[]> = { yes: [], maybe: [], no: [] }
  if (host) rsvpEntries.yes.push({ name: host.name, isHost: true })
  // In guest preview the host's clicks reflect in the buttons like any guest's;
  // outside of it their answer is pinned to yes.
  let myStatus: 'yes' | 'maybe' | 'no' | null = viewerIsHost && !viewAsGuest ? 'yes' : null
  for (const doc of rsvps.docs) {
    const rsvpUser = asUser(doc.user)
    if (!rsvpUser) continue
    if (rsvpUser.id === user.id && (!viewerIsHost || viewAsGuest)) myStatus = doc.status
    if (rsvpUser.id === host?.id) continue
    rsvpEntries[doc.status].push({ name: rsvpUser.name })
  }

  const mediaUrl = (value: number | Media | null | undefined): string | null => {
    const media = asMedia(value)
    return media?.sizes?.card?.url ?? media?.url ?? null
  }

  const commentsByPost = new Map<number, WallPost['comments']>()
  for (const comment of comments.docs) {
    const postId = typeof comment.post === 'object' ? comment.post.id : comment.post
    const list = commentsByPost.get(postId) ?? []
    list.push({
      id: comment.id,
      authorName: asUser(comment.author)?.name ?? '?',
      content: comment.content,
      imageUrl: mediaUrl(comment.image),
      gifUrl: comment.gifUrl,
      createdAt: comment.createdAt,
    })
    commentsByPost.set(postId, list)
  }

  const wallPosts: WallPost[] = posts.docs.map((post) => ({
    id: post.id,
    authorName: asUser(post.author)?.name ?? '?',
    content: post.content,
    imageUrl: mediaUrl(post.image),
    gifUrl: post.gifUrl,
    deleted: Boolean(post.deleted),
    mine: asUser(post.author)?.id === user.id,
    createdAt: post.createdAt,
    comments: commentsByPost.get(post.id) ?? [],
  }))

  const bringItems: BringListItem[] = items.docs.map((item) => {
    const claimedBy = asUser(item.claimedBy)
    const createdById = typeof item.createdBy === 'object' ? item.createdBy?.id : item.createdBy
    return {
      id: item.id,
      title: item.title,
      note: item.note,
      claimedByName: claimedBy?.name ?? null,
      claimedByMe: claimedBy?.id === user.id,
      canDelete: isAdmin || createdById === user.id,
    }
  })

  const coverImage = asMedia(event.coverImage)
  const galleryPhotos: GalleryPhoto[] = photos.docs
    .filter((photo) => photo.id !== coverImage?.id)
    .map((photo) => ({
      id: photo.id,
      url: photo.sizes?.card?.url ?? photo.url ?? '',
      largeUrl: photo.sizes?.hero?.url ?? photo.url ?? photo.sizes?.card?.url ?? '',
      alt: photo.alt ?? '',
      caption: photo.caption,
      uploaderName: asUser(photo.uploadedBy)?.name ?? null,
    }))
    .filter((photo) => photo.url)

  const when = formatEventDate(event.date, locale)
  const location = event.location
  const addressLine = [location?.street, [location?.zip, location?.city].filter(Boolean).join(' ')]
    .filter(Boolean)
    .join(', ')
  // Maps gets ONLY the address — the location's nickname would confuse it
  const mapsQuery = addressLine

  const themeMode = await getThemeMode()
  const lightMode = themeMode ? themeMode === 'light' : Boolean(event.invertTheme)

  const needsRsvp = (!viewerIsHost || viewAsGuest) && myStatus === null

  return (
    <article className="event">
      {needsRsvp && (
        <a href="#rsvp" className="rsvp-nudgebar">
          <span className="rsvp-nudgebar__inner">
            {dict.rsvp.nudge} <ArrowDown />
          </span>
        </a>
      )}
      {kicker}
      <header id="info" className="event__hero reveal">
        {isRealAdmin && (
          <AdminDock
            viewAsGuest={viewAsGuest}
            canEdit={isAdmin}
            editLabel={dict.events.edit}
            viewLabels={{ admin: dict.events.viewAdmin, guest: dict.events.viewGuest }}
            dict={dict.eventForm}
            light={lightMode}
            event={{
              id: event.id,
              title: event.title,
              dateIso: event.date,
              locationName: event.location?.name,
              street: event.location?.street,
              zip: event.location?.zip,
              city: event.location?.city,
              themeColor: event.themeColor,
              accentColor: event.accentColor,
              accentColorLight: event.accentColorLight,
              description: richTextToPlain(event.description),
            }}
          />
        )}
        {isPast && <div className="sticker sticker--past">{dict.hero.pastBadge}</div>}

        <div className="event__hero-main">
          <div className="event__calendar" aria-hidden>
            <span className="event__calendar-weekday">{when.weekday}</span>
            <span className="event__calendar-day">{when.day}</span>
            <span className="event__calendar-month">{when.month}</span>
          </div>

          <div className="event__hero-text">
            <h1 className="event__title">{event.title}</h1>

            <dl className="event__facts">
              <div className="event__fact">
                <dt>{dict.hero.when}</dt>
                <dd>
                  {when.full}
                  <span className="event__fact-sub">{when.time}</span>
                </dd>
              </div>
              {(location?.name || addressLine) && (
                <div className="event__fact">
                  <dt>{dict.hero.where}</dt>
                  <dd>
                    {location?.name}
                    {addressLine && <span className="event__fact-sub">{addressLine}</span>}
                    {mapsQuery && (
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsQuery)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="event__map-link"
                      >
                        {dict.hero.mapLink} <ArrowUpRight />
                      </a>
                    )}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </div>

        {coverImage?.sizes?.hero?.url || coverImage?.url ? (
          <div className="event__cover">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={coverImage.sizes?.hero?.url ?? coverImage.url ?? ''} alt={coverImage.alt ?? event.title} />
          </div>
        ) : null}

        {event.description && (
          <div className="event__description">
            <h3 className="event__facts-what">{dict.hero.what}</h3>
            <RichText data={event.description} />
          </div>
        )}

        <div id="rsvp" className="event__rsvp">
          <h2 className="section__title">{dict.rsvp.title}</h2>
          <Rsvp
            eventId={event.id}
            myStatus={myStatus}
            entries={rsvpEntries}
            canRespond={!viewerIsHost || viewAsGuest}
            dict={dict.rsvp}
          />
        </div>

        {isAdmin && event.inviteToken && (
          <div className="event__invite">
            <InviteLink token={event.inviteToken} dict={dict.invite} />
          </div>
        )}
      </header>

      {myStatus !== 'no' && (
        <section id="mitbringen" className="section section--bring reveal" style={{ animationDelay: '0.1s' }}>
          <h2 className="section__title">{dict.bring.title}</h2>
          <p className="section__subtitle">{dict.bring.subtitle}</p>
          <BringList eventId={event.id} items={bringItems} hostName={host?.name} dict={dict.bring} />
        </section>
      )}

      <section id="pinnwand" className="section section--wall reveal" style={{ animationDelay: '0.2s' }}>
        <h2 className="section__title">{dict.wall.title}</h2>
        <p className="section__subtitle">{dict.wall.subtitle}</p>
        <Wall
          eventId={event.id}
          posts={wallPosts}
          userName={user.name}
          hostName={host?.name}
          isAdmin={isAdmin}
          locale={locale}
          dict={dict.wall}
        />
      </section>

      <section id="fotos" className="section section--gallery reveal" style={{ animationDelay: '0.3s' }}>
        <h2 className="section__title">{dict.gallery.title}</h2>
        <p className="section__subtitle">{dict.gallery.subtitle}</p>
        <Gallery eventId={event.id} photos={galleryPhotos} unlocked={photosUnlocked} dict={dict.gallery} />
      </section>
    </article>
  )
}
