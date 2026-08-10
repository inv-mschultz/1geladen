import { randomBytes } from 'crypto'
import path from 'path'
import type { CollectionConfig } from 'payload'

import {
  assertEventMember,
  canActAsHost,
  globalBypass,
  isLoggedIn,
  isOwnerOrEventHost,
  memberEventIds,
} from '@/access'

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
          if (data.event) await assertEventMember(req, data.event)
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
    imageSizes: [
      { name: 'thumbnail', width: 400, height: 400, position: 'centre' },
      { name: 'card', width: 800 },
      { name: 'hero', width: 1600 },
    ],
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
