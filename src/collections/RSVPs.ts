import type { CollectionConfig } from 'payload'
import { ValidationError } from 'payload'

import {
  assertEventMember,
  isAdminFieldLevel,
  isAdminOrOwner,
  isEventMember,
  isLoggedIn,
} from '@/access'

export const RSVPs: CollectionConfig = {
  slug: 'rsvps',
  labels: {
    singular: 'RSVP',
    plural: 'RSVPs',
  },
  admin: {
    defaultColumns: ['user', 'event', 'status'],
  },
  access: {
    read: isEventMember('event'),
    create: isLoggedIn,
    update: isAdminOrOwner('user'),
    delete: isAdminOrOwner('user'),
  },
  hooks: {
    beforeChange: [
      async ({ data, operation, req }) => {
        if (operation === 'create' && req.user) {
          await assertEventMember(req, data.event)
          if (req.user.role !== 'admin') {
            data.user = req.user.id
          }
          // One RSVP per guest per event — you cannot both come and not come.
          // (Schrödinger's guest is not supported.)
          const existing = await req.payload.find({
            collection: 'rsvps',
            where: {
              and: [{ user: { equals: data.user } }, { event: { equals: data.event } }],
            },
            limit: 1,
          })
          if (existing.totalDocs > 0) {
            throw new ValidationError({
              errors: [
                {
                  path: 'event',
                  message: 'You already RSVPed to this event — update your existing RSVP instead.',
                },
              ],
            })
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
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
      defaultValue: ({ user }) => user?.id,
      // Admins may RSVP on a guest's behalf; guests are pinned to themselves by
      // the beforeChange hook on create, and locked out of reassigning on update.
      access: {
        update: isAdminFieldLevel,
      },
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      options: [
        { label: 'Attending', value: 'yes' },
        { label: 'Maybe', value: 'maybe' },
        { label: 'Can’t make it', value: 'no' },
      ],
    },
  ],
}
