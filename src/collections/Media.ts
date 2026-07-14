import type { CollectionConfig } from 'payload'

import { isAdminOrOwner, isLoggedIn } from '@/access'

export const Media: CollectionConfig = {
  slug: 'media',
  admin: {
    defaultColumns: ['filename', 'uploadedBy', 'event'],
  },
  access: {
    // Public read so <img> tags and the Next.js image optimizer can fetch files
    read: () => true,
    create: isLoggedIn,
    update: isAdminOrOwner('uploadedBy'),
    delete: isAdminOrOwner('uploadedBy'),
  },
  hooks: {
    beforeChange: [
      ({ data, operation, req }) => {
        if (operation === 'create' && req.user && req.user.role !== 'admin') {
          data.uploadedBy = req.user.id
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
