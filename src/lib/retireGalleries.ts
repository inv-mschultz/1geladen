import type { Payload } from 'payload'

import { relId } from '@/access'
import { GALLERY_RETENTION_DAYS, galleryRetiresAt } from '@/lib/time'

/** Events per run. A daily cron with a function timeout should not try to do a year's backlog at once. */
const BATCH = 25

/**
 * Deletes the gallery photos of every party that ended more than 30 days ago.
 *
 * The cover image is spared — it's the event's face on the overview, not a
 * gallery photo — as are images attached to wall posts, which belong to the
 * conversation. Payload deletes the Blob files along with each media doc.
 *
 * Idempotent: an event is stamped `galleryRetiredAt` only after its photos are
 * gone, so a run that dies halfway simply picks the event up again tomorrow.
 */
export async function retireDueGalleries(
  payload: Payload,
  now: Date = new Date(),
): Promise<{ retired: number; photos: number }> {
  // Prefilter on the start date, which is indexed. Every event retiring today
  // started at least the retention period ago; endDate can only push a
  // retirement later, which the exact check below catches.
  const startedBefore = new Date(now.getTime() - GALLERY_RETENTION_DAYS * 86_400_000)
  const { docs } = await payload.find({
    collection: 'events',
    where: {
      and: [
        { date: { less_than: startedBefore.toISOString() } },
        { galleryRetiredAt: { exists: false } },
      ],
    },
    sort: 'date',
    limit: BATCH,
    depth: 0,
    select: { date: true, endDate: true, coverImage: true },
    overrideAccess: true,
  })

  let retired = 0
  let photos = 0
  for (const event of docs) {
    if (galleryRetiresAt(event).getTime() > now.getTime()) continue

    const coverId = relId(event.coverImage)
    const { docs: deleted } = await payload.delete({
      collection: 'media',
      where: {
        and: [{ event: { equals: event.id } }, ...(coverId ? [{ id: { not_equals: coverId } }] : [])],
      },
      depth: 0,
      overrideAccess: true,
    })
    await payload.update({
      collection: 'events',
      id: event.id,
      data: { galleryRetiredAt: now.toISOString() },
      overrideAccess: true,
    })
    retired += 1
    photos += deleted.length
  }

  return { retired, photos }
}
