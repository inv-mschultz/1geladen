import type { CollectionConfig } from 'payload'

import { assertEventMember, isAdminOrOwner, isEventMember, isLoggedIn } from '@/access'
import { GIF_URL_PATTERN, requireSomeContent } from './Posts'

export const Comments: CollectionConfig = {
  slug: 'comments',
  admin: {
    defaultColumns: ['author', 'post', 'createdAt'],
  },
  access: {
    read: isEventMember('post.event'),
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
      async ({ data, operation, req }) => {
        if (operation === 'create') {
          const postId = typeof data.post === 'object' ? data.post?.id : data.post
          const post = postId
            ? await req.payload.findByID({ collection: 'posts', id: postId, depth: 0, overrideAccess: true })
            : null
          await assertEventMember(req, post?.event as number | undefined)
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
      name: 'post',
      type: 'relationship',
      relationTo: 'posts',
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
      maxLength: 1000,
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
  ],
}
