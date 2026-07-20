import type { CollectionConfig } from 'payload'
import { ValidationError } from 'payload'

import { assertEventMember, isAdmin, isAdminOrOwner, isEventMember, isLoggedIn } from '@/access'
import { isAllowedReaction } from '@/lib/emoji'

/**
 * One emoji reaction by one guest on one post *or* one comment.
 *
 * Two deliberate shape decisions:
 *
 * 1. `event` is denormalised onto the row. Read access could in principle walk
 *    `comment.post.event`, but a three-hop relationship filter on every wall
 *    render is both slow and fragile; a stamped event id reuses the same
 *    isEventMember('event') check as posts and RSVPs.
 *
 * 2. Every relationship field is optional, so its column stays nullable. Payload
 *    generates ON DELETE SET NULL for relationships, and pairing that with a NOT
 *    NULL column is what made users undeletable (see releaseUserContent). Rows
 *    are cleaned up explicitly on delete instead; presence is enforced below.
 */
export const Reactions: CollectionConfig = {
  slug: 'reactions',
  admin: {
    defaultColumns: ['emoji', 'user', 'post', 'comment', 'createdAt'],
  },
  access: {
    read: isEventMember('event'),
    create: isLoggedIn,
    // Reactions are toggled, never edited — only admins can touch an existing row.
    update: isAdmin,
    delete: isAdminOrOwner('user'),
  },
  hooks: {
    beforeValidate: [
      ({ data, operation }) => {
        if (operation !== 'create') return data
        const hasPost = Boolean(data?.post)
        const hasComment = Boolean(data?.comment)
        if (hasPost === hasComment) {
          throw new ValidationError({
            errors: [
              {
                path: 'post',
                message: 'A reaction belongs to exactly one post or one comment.',
              },
            ],
          })
        }
        if (!isAllowedReaction(data?.emoji)) {
          throw new ValidationError({
            errors: [{ path: 'emoji', message: 'That emoji is not one of the available reactions.' }],
          })
        }
        return data
      },
    ],
    beforeChange: [
      async ({ data, operation, req }) => {
        if (operation !== 'create' || !req.user) return data

        // Guests always react as themselves.
        if (req.user.role !== 'admin') data.user = req.user.id

        // Stamp the event from whichever target this is, and check membership
        // against it — a guest may only react inside their own events.
        const postId = typeof data.post === 'object' ? data.post?.id : data.post
        const commentId = typeof data.comment === 'object' ? data.comment?.id : data.comment

        if (postId) {
          const post = await req.payload.findByID({
            collection: 'posts',
            id: postId,
            depth: 0,
            overrideAccess: true,
            req,
          })
          data.event = typeof post.event === 'object' ? post.event.id : post.event
        } else {
          const comment = await req.payload.findByID({
            collection: 'comments',
            id: commentId,
            depth: 0,
            overrideAccess: true,
            req,
          })
          const parentId = typeof comment.post === 'object' ? comment.post?.id : comment.post
          const parent = await req.payload.findByID({
            collection: 'posts',
            id: parentId as number,
            depth: 0,
            overrideAccess: true,
            req,
          })
          data.event = typeof parent.event === 'object' ? parent.event.id : parent.event
        }

        await assertEventMember(req, data.event)

        // One row per (guest, target, emoji) — reacting twice is a toggle, and
        // the toggle action deletes instead. This guards the direct API path.
        const duplicate = await req.payload.find({
          collection: 'reactions',
          where: {
            and: [
              { user: { equals: data.user } },
              { emoji: { equals: data.emoji } },
              postId ? { post: { equals: postId } } : { comment: { equals: commentId } },
            ],
          },
          limit: 1,
          depth: 0,
          overrideAccess: true,
          req,
        })
        if (duplicate.totalDocs > 0) {
          throw new ValidationError({
            errors: [{ path: 'emoji', message: 'You already reacted with this emoji.' }],
          })
        }

        return data
      },
    ],
  },
  fields: [
    {
      name: 'emoji',
      type: 'text',
      required: true,
      index: true,
    },
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      index: true,
      defaultValue: ({ user }) => user?.id,
    },
    {
      name: 'post',
      type: 'relationship',
      relationTo: 'posts',
      index: true,
    },
    {
      name: 'comment',
      type: 'relationship',
      relationTo: 'comments',
      index: true,
    },
    {
      // Denormalised from the target so read access is a single indexed check.
      name: 'event',
      type: 'relationship',
      relationTo: 'events',
      index: true,
      admin: { readOnly: true },
    },
  ],
}
