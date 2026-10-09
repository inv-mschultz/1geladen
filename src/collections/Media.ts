import { randomBytes } from 'crypto'
import path from 'path'
import type { CollectionConfig } from 'payload'
import { APIError } from 'payload'

import {
  assertEventMember,
  canActAsHost,
  globalBypass,
  isLoggedIn,
  isOwnerOrEventHost,
  memberEventIds,
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
    // <img> requests are same-origin, so the session cookie rides along:
    // event photos are visible to that event's members, eventless uploads
    // (post/comment images) to any logged-in user.
    read: async ({ req }) => {
      if (!req.user) return false
      if (globalBypass(req.user)) return true
      const ids = await memberEventIds(req)
      return {
        or: [{ event: { exists: false } }, ...(ids.length ? [{ event: { in: ids } }] : [])],
      }
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
      admin: {
        description: 'Attach to an event to show this photo in its gallery.',
      },
    },
    {
      name: 'uploadedBy',
      type: 'relationship',
      relationTo: 'users',
      index: true,
      defaultValue: ({ user }) => user?.id,
      admin: { readOnly: true, position: 'sidebar' },
    },
  ],
}
