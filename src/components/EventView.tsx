import { RichText } from '@payloadcms/richtext-lexical/react'
import config from '@payload-config'
import { getPayload } from 'payload'
import React from 'react'

import type { Dictionary, Locale } from '@/i18n/dictionaries'
import type { Event, Media, User } from '@/payload-types'
import { BringList, type BringListItem } from './BringList'
import { ArrowUpRight } from './icons'
import { Gallery, type GalleryPhoto } from './Gallery'
import { Rsvp } from './Rsvp'
import { Wall, type WallPost } from './Wall'

const asUser = (value: number | User | null | undefined): User | null =>
  typeof value === 'object' && value !== null ? value : null

const asMedia = (value: number | Media | null | undefined): Media | null =>
  typeof value === 'object' && value !== null ? value : null

function formatEventDate(date: string, locale: Locale): { full: string; time: string; day: string; month: string; weekday: string } {
  const d = new Date(date)
  const intlLocale = locale === 'de' ? 'de-DE' : 'en-GB'
  const full = new Intl.DateTimeFormat(intlLocale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d)
  const time =
    new Intl.DateTimeFormat(intlLocale, { hour: '2-digit', minute: '2-digit' }).format(d) +
    (locale === 'de' ? ' Uhr' : '')
  const day = new Intl.DateTimeFormat(intlLocale, { day: '2-digit' }).format(d)
  const month = new Intl.DateTimeFormat(intlLocale, { month: 'short' }).format(d)
  const weekday = new Intl.DateTimeFormat(intlLocale, { weekday: 'short' }).format(d)
  return { full, time, day, month, weekday }
}

export async function EventView({
  event,
  user,
  dict,
  locale,
}: {
  event: Event
  user: User
  dict: Dictionary
  locale: Locale
}) {
  const payload = await getPayload({ config })

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
      where:
        user.role === 'admin'
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

  const rsvpNames: Record<'yes' | 'maybe' | 'no', string[]> = { yes: [], maybe: [], no: [] }
  let myStatus: 'yes' | 'maybe' | 'no' | null = null
  for (const doc of rsvps.docs) {
    const rsvpUser = asUser(doc.user)
    if (!rsvpUser) continue
    rsvpNames[doc.status].push(rsvpUser.name)
    if (rsvpUser.id === user.id) myStatus = doc.status
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
      canDelete: user.role === 'admin' || createdById === user.id,
    }
  })

  const coverImage = asMedia(event.coverImage)
  const galleryPhotos: GalleryPhoto[] = photos.docs
    .filter((photo) => photo.id !== coverImage?.id)
    .map((photo) => ({
      id: photo.id,
      url: photo.sizes?.card?.url ?? photo.url ?? '',
      alt: photo.alt ?? '',
      caption: photo.caption,
      uploaderName: asUser(photo.uploadedBy)?.name ?? null,
    }))
    .filter((photo) => photo.url)

  const when = formatEventDate(event.date, locale)
  const location = event.location

  return (
    <article className="event">
      <header id="info" className="event__hero reveal">
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
              {(location?.name || location?.address) && (
                <div className="event__fact">
                  <dt>{dict.hero.where}</dt>
                  <dd>
                    {location?.name}
                    {location?.address && <span className="event__fact-sub">{location.address}</span>}
                    {location?.mapsUrl && (
                      <a href={location.mapsUrl} target="_blank" rel="noopener noreferrer" className="event__map-link">
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

        <div className="event__rsvp">
          <h2 className="section__title">{dict.rsvp.title}</h2>
          <Rsvp eventId={event.id} myStatus={myStatus} names={rsvpNames} dict={dict.rsvp} />
        </div>
      </header>

      {myStatus !== 'no' && (
        <section id="mitbringen" className="section section--bring reveal" style={{ animationDelay: '0.1s' }}>
          <h2 className="section__title">{dict.bring.title}</h2>
          <p className="section__subtitle">{dict.bring.subtitle}</p>
          <BringList eventId={event.id} items={bringItems} dict={dict.bring} />
        </section>
      )}

      <section id="pinnwand" className="section section--wall reveal" style={{ animationDelay: '0.2s' }}>
        <h2 className="section__title">{dict.wall.title}</h2>
        <p className="section__subtitle">{dict.wall.subtitle}</p>
        <Wall
          eventId={event.id}
          posts={wallPosts}
          userName={user.name}
          isAdmin={user.role === 'admin'}
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
