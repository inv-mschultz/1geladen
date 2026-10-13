import { randomBytes } from 'crypto'
import path from 'path'
import type { CollectionConfig, Where } from 'payload'
import { APIError } from 'payload'

import {
  assertEventMember,
  canActAsHost,
  globalBypass,
  isLoggedIn,
  isOwnerOrEventHost,
  memberEventIds,
  neverUpdate,
  peerUserIds,
  relId,
} from '@/access'
import { galleryRetiresAt } from '@/lib/time'

/**
 * Photos per gallery. Storage is the one thing that costs real money on the
 * free tiers, and no dinner party needs more than this.
 */
export const MAX_PHOTOS_PER_EVENT = 300

export const Media: CollectionConfig = {
  slug: 'media',
  admin: {
    defaultColumns: ['filename', 'uploadedBy', 'event'],
  },
  access: {
    // <img> requests are same-origin, so the session cookie rides along.
    // Gallery photos (`event`) and wall images (`wallEvent`) are visible to
    // that event's members. Anything attached to neither — cover images
    // uploaded in the backstage, stray API uploads — only to people who share
    // an event with whoever uploaded it.
    read: async ({ req }) => {
      if (!req.user) return false
      if (globalBypass(req.user)) return true
      const ids = await memberEventIds(req)
      return {
        or: [
          ...(ids.length ? [{ event: { in: ids } }, { wallEvent: { in: ids } }] : []),
          {
            and: [
              { event: { exists: false } },
              { wallEvent: { exists: false } },
              { uploadedBy: { in: await peerUserIds(req) } },
            ],
          },
        ],
      } as Where
    },
    create: isLoggedIn,
    update: isOwnerOrEventHost('uploadedBy', 'event'),
    delete: isOwnerOrEventHost('uploadedBy', 'event'),
  },
  hooks: {
    // The Blob store is public: anyone holding a blob URL can read it, and the
    // event-member check above only guards the surrounding page. Photos are
    // named after whatever came off the phone (IMG_4312.jpg), which is trivially
    // guessable, so replace the base name with random bytes before Payload
    // derives any filename from it. Runs ahead of generateFileData, so all three
    // imageSizes inherit the random base too.
    beforeOperation: [
      ({ operation, req }) => {
        if (operation !== 'create' && operation !== 'update') return
        if (!req.file) return
        const ext = path.extname(req.file.name)
        req.file.name = `${randomBytes(16).toString('hex')}${ext.toLowerCase()}`
      },
    ],
    beforeChange: [
      async ({ data, operation, req }) => {
        if (operation === 'create') {
          if (data.wallEvent) await assertEventMember(req, data.wallEvent)
          if (data.event) {
            await assertEventMember(req, data.event)
            const { totalDocs } = await req.payload.count({
              collection: 'media',
              where: { event: { equals: data.event } },
              overrideAccess: true,
              req,
            })
            if (totalDocs >= MAX_PHOTOS_PER_EVENT) {
              throw new APIError(`This gallery is full (${MAX_PHOTOS_PER_EVENT} photos).`, 400)
            }
            // Uploads stop on the day the photos are due to go, not on whichever
            // later day the cron gets round to deleting them.
            const event = await req.payload.findByID({
              collection: 'events',
              id: relId(data.event) as number,
              depth: 0,
              select: { date: true, endDate: true, galleryRetiredAt: true },
              overrideAccess: true,
              req,
            })
            if (event.galleryRetiredAt || galleryRetiresAt(event).getTime() <= Date.now()) {
              throw new APIError('This gallery has been retired.', 400)
            }
          }
          if (req.user && !(await canActAsHost(req, data.event))) {
            data.uploadedBy = req.user.id
          }
        }
        return data
      },
    ],
  },
  upload: {
    mimeTypes: ['image/*'],
    // The original doubles as the large version (lightbox, cover image), so
    // it is capped instead of kept at camera size next to a separate 'hero'
    // copy. Two files per photo rather than four: Blob storage is the one
    // limit the free tier actually hits.
    resizeOptions: { width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true },
    imageSizes: [{ name: 'card', width: 800 }],
    adminThumbnail: 'card',
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
    },
    {
      name: 'caption',
      type: 'text',
    },
    {
      name: 'event',
      type: 'relationship',
      relationTo: 'events',
      index: true,
      access: { update: neverUpdate },
      admin: {
        description: 'Attach to an event to show this photo in its gallery.',
      },
    },
    {
      // The event whose wall a post or comment image belongs to. Kept apart
      // from `event` so wall images neither show in the gallery, count
      // against its cap, nor go when it retires — it only scopes who sees them.
      name: 'wallEvent',
      type: 'relationship',
      relationTo: 'events',
      index: true,
      access: { update: neverUpdate },
      admin: { readOnly: true, position: 'sidebar' },
    },
    {
      name: 'uploadedBy',
      type: 'relationship',
      relationTo: 'users',
      index: true,
      defaultValue: ({ user }) => user?.id,
      access: { update: neverUpdate },
      admin: { readOnly: true, position: 'sidebar' },
    },
  ],
}
