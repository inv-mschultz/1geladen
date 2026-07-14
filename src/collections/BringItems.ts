import type { CollectionConfig, FieldAccess } from 'payload'
import { Forbidden } from 'payload'

import { isAdminOrOwner, isLoggedIn } from '@/access'

const relId = (value: unknown): number | null => {
  if (value == null) return null
  if (typeof value === 'object') return (value as { id: number }).id
  return value as number
}

// Item details may only be edited by the creator or an admin.
// Returning false silently strips the field from the update.
const isAdminOrCreatorField: FieldAccess = ({ req: { user }, doc }) => {
  if (!user) return false
  if (user.role === 'admin') return true
  return relId(doc?.createdBy) === user.id
}

export const BringItems: CollectionConfig = {
  slug: 'bring-items',
  labels: {
    singular: 'Bring item',
    plural: 'Bring items',
  },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'event', 'claimedBy'],
  },
  access: {
    read: isLoggedIn,
    create: isLoggedIn,
    // Everyone logged in may update — but guests are limited to claiming/unclaiming
    // themselves via the field access + hook below.
    update: isLoggedIn,
    delete: isAdminOrOwner('createdBy'),
  },
  hooks: {
    beforeChange: [
      ({ data, operation, req, originalDoc }) => {
        if (operation === 'create' && req.user && req.user.role !== 'admin') {
          data.createdBy = req.user.id
        }

        // Guests may only claim a free item for themselves, or release their own claim.
        if (
          operation === 'update' &&
          req.user &&
          req.user.role !== 'admin' &&
          data &&
          'claimedBy' in data
        ) {
          const incoming = relId(data.claimedBy)
          const current = relId(originalDoc?.claimedBy)
          const me = req.user.id
          const claiming = incoming === me && current === null
          const unclaiming = incoming === null && current === me
          const unchanged = incoming === current
          if (!claiming && !unclaiming && !unchanged) {
            throw new Forbidden()
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
      access: {
        update: isAdminOrCreatorField,
      },
    },
    {
      name: 'title',
      type: 'text',
      required: true,
      admin: { description: 'e.g. "Kartoffelsalat", "Wine (red)", "Good mood"' },
      access: {
        update: isAdminOrCreatorField,
      },
    },
    {
      name: 'note',
      type: 'text',
      admin: { description: 'Optional details — "enough for 12 people"' },
      access: {
        update: isAdminOrCreatorField,
      },
    },
    {
      name: 'claimedBy',
      type: 'relationship',
      relationTo: 'users',
      index: true,
      admin: { description: 'Who is bringing this? Empty = up for grabs.' },
    },
    {
      name: 'createdBy',
      type: 'relationship',
      relationTo: 'users',
      defaultValue: ({ user }) => user?.id,
      admin: { readOnly: true, position: 'sidebar' },
      access: {
        update: ({ req: { user } }) => user?.role === 'admin',
      },
    },
  ],
}
