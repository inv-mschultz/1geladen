import type { Payload, TypedUser } from 'payload'

import type { GalleryPhoto } from '@/components/Gallery'
import type { User } from '@/payload-types'

/**
 * How many photos a page load fetches. Like the wall, the gallery is
 * re-queried on every event mutation, so we load a window and let guests
 * pull the rest on demand instead of shipping the whole album each time.
 */
export const GALLERY_PAGE_SIZE = 24

const asUser = (value: number | User | null | undefined): User | null =>
  typeof value === 'object' && value !== null ? value : null

export async function fetchGalleryPhotos({
  payload,
  user,
  eventId,
  coverImageId,
  before,
}: {
  payload: Payload
  user: TypedUser
  eventId: number
  /** The cover image is shown in the hero, not in the gallery grid. */
  coverImageId?: number | null
  /** ISO date — fetch photos strictly older than this (pagination cursor). */
  before?: string
}): Promise<{ photos: GalleryPhoto[]; hasMore: boolean }> {
  const cursor = before ? [{ createdAt: { less_than: before } }] : []

  const media = await payload.find({
    collection: 'media',
    where: { and: [{ event: { equals: eventId } }, ...cursor] },
    sort: '-createdAt',
    depth: 1,
    limit: GALLERY_PAGE_SIZE,
    overrideAccess: false,
    user,
  })

  return {
    photos: media.docs
      .filter((photo) => photo.id !== coverImageId)
      .map((photo) => ({
        id: photo.id,
        url: photo.sizes?.card?.url ?? photo.url ?? '',
        largeUrl: photo.sizes?.hero?.url ?? photo.url ?? photo.sizes?.card?.url ?? '',
        alt: photo.alt ?? '',
        caption: photo.caption,
        uploaderName: asUser(photo.uploadedBy)?.name ?? null,
        createdAt: photo.createdAt,
      }))
      .filter((photo) => photo.url),
    hasMore: media.hasNextPage ?? false,
  }
}
