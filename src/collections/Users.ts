import type { CollectionConfig, FieldAccess } from 'payload'

import {
  isAdminOrSelf,
  isEventPeerOrSelf,
  isPlatformAdminFieldLevel,
} from '@/access'
import { releaseUserContent } from '@/lib/deletedGuest'
import { assertNotSoleHost } from '@/lib/membership'

/**
 * Guests see each other's names, never each other's addresses: anyone holding
 * an invite link — and those get forwarded to big group chats — could
 * otherwise join with a made-up name and collect every guest's email.
 */
const isSelfOrPlatformAdmin: FieldAccess = ({ req: { user }, doc }) =>
  user?.role === 'admin' || (Boolean(user) && (doc as { id?: number } | undefined)?.id === user?.id)

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'email', 'role'],
  },
  auth: {
    // Guests shouldn't have to log in before every party — keep sessions for 30 days
    tokenExpiration: 60 * 60 * 24 * 30,
  },
  access: {
    // Only admins may enter the backstage area
    admin: ({ req: { user } }) => user?.role === 'admin',
    // Anyone may register as a guest; the role field below is admin-locked
    create: () => true,
    read: isEventPeerOrSelf,
    update: isAdminOrSelf,
    // Yourself (from /account), or anybody from the backstage.
    delete: ({ req: { user } }) =>
      user?.role === 'admin' ? true : user ? { id: { equals: user.id } } : false,
  },
  hooks: {
    beforeChange: [
      // The very first user to sign up becomes the host (admin)
      async ({ data, operation, req }) => {
        if (operation === 'create') {
          const { totalDocs } = await req.payload.count({ collection: 'users' })
          if (totalDocs === 0) {
            data.role = 'admin'
          }
        }
        return data
      },
    ],
    beforeDelete: [
      // Losing the last host of an event would make it unreachable for
      // everyone, and the FK cascade would do it silently. Checked first, so
      // nothing is released before we know the delete can go ahead.
      async ({ id, req }) => {
        await assertNotSoleHost(req, Number(id))
      },
      // Hand off the guest's content before the row goes, or the delete fails on
      // the NOT NULL author/user columns. See releaseUserContent.
      async ({ id, req }) => {
        await releaseUserContent(req, Number(id))
      },
    ],
  },
  fields: [
    {
      // Payload's own email field, redeclared only to restrict who reads it.
      name: 'email',
      type: 'email',
      required: true,
      unique: true,
      index: true,
      access: { read: isSelfOrPlatformAdmin },
    },
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      // Set for accounts created via an invite link (name-only join). These can
      // be re-entered from the join page and upgraded to full accounts later.
      name: 'guestJoin',
      type: 'checkbox',
      defaultValue: false,
      index: true,
      access: {
        create: isPlatformAdminFieldLevel,
        update: isPlatformAdminFieldLevel,
      },
      admin: { position: 'sidebar' },
    },
    {
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: 'guest',
      saveToJWT: true,
      options: [
        { label: 'Platform admin (backstage)', value: 'admin' },
        { label: 'Guest', value: 'guest' },
      ],
      // Backstage access only. Hosting needs no role — any real account may
      // create events — and control over an event lives in events.hosts.
      access: {
        create: isPlatformAdminFieldLevel,
        update: isPlatformAdminFieldLevel,
      },
    },
  ],
}
