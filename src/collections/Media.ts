import type { CollectionConfig } from 'payload'

import { assertEventMember, isAdminOrOwner, isLoggedIn, memberEventIds } from '@/access'

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
      if (req.user.role === 'admin') return true
      const ids = await memberEventIds(req)
      return {
        or: [{ event: { exists: false } }, ...(ids.length ? [{ event: { in: ids } }] : [])],
      }
    },
    create: isLoggedIn,
    update: isAdminOrOwner('uploadedBy'),
    delete: isAdminOrOwner('uploadedBy'),
  },
  hooks: {
    beforeChange: [
      async ({ data, operation, req }) => {
        if (operation === 'create') {
          if (data.event) await assertEventMember(req, data.event)
          if (req.user && req.user.role !== 'admin') {
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
