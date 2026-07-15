import type { CollectionConfig } from 'payload'
import { ValidationError } from 'payload'

import { assertEventMember, isAdminOrOwner, isEventMember, isLoggedIn } from '@/access'

/** Only GIFs hosted by GIPHY may be embedded. */
export const GIF_URL_PATTERN = /^https:\/\/media\d*\.giphy\.com\//

export const requireSomeContent = (data: Record<string, unknown> | undefined): void => {
  const content = typeof data?.content === 'string' ? data.content.trim() : ''
  if (!content && !data?.image && !data?.gifUrl) {
    throw new ValidationError({
      errors: [{ path: 'content', message: 'Post needs text, an image, or a GIF.' }],
    })
  }
}

export const Posts: CollectionConfig = {
  slug: 'posts',
  admin: {
    defaultColumns: ['author', 'event', 'deleted', 'createdAt'],
  },
  access: {
    read: isEventMember('event'),
    create: isLoggedIn,
    update: isAdminOrOwner('author'),
    delete: isAdminOrOwner('author'),
  },
  hooks: {
    beforeValidate: [
      ({ data, operation }) => {
        if (operation === 'create') requireSomeContent(data)
        return data
      },
    ],
    beforeChange: [
      // Guests always post as themselves and only into their own events
      async ({ data, operation, req }) => {
        if (operation === 'create') {
          await assertEventMember(req, data.event)
          if (req.user && req.user.role !== 'admin') {
            data.author = req.user.id
          }
        }
        return data
      },
    ],
  },
  fields: [
    {
      name: 'event',
      type: 'relationship',
      relationTo: 'events',
      required: true,
      index: true,
    },
    {
      name: 'author',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
      defaultValue: ({ user }) => user?.id,
      admin: { readOnly: true },
    },
    {
      name: 'content',
      type: 'textarea',
      maxLength: 2000,
    },
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'gifUrl',
      type: 'text',
      validate: (value: string | null | undefined) =>
        !value || GIF_URL_PATTERN.test(value) || 'Only GIPHY URLs are allowed.',
    },
    {
      // Soft delete: authors can take a post down, admins can resurface it.
      name: 'deleted',
      type: 'checkbox',
      defaultValue: false,
      index: true,
      admin: { position: 'sidebar' },
    },
  ],
}
