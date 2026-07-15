import { randomBytes } from 'crypto'
import type { CollectionConfig } from 'payload'

import { isAdmin } from '@/access'

const formatSlug = (value: string): string =>
  value
    .toLowerCase()
    .replace(/ä/g, 'ae')
    .replace(/ö/g, 'oe')
    .replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

export const Events: CollectionConfig = {
  slug: 'events',
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'date', 'slug'],
  },
  access: {
    // Guests only see events they are a member of (joined via invite link)
    read: ({ req: { user } }) => {
      if (!user) return false
      if (user.role === 'admin') return true
      return { members: { in: [user.id] } }
    },
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  hooks: {
    beforeValidate: [
      ({ data, originalDoc }) => {
        if (data && !data.slug) {
          const title = data.title ?? originalDoc?.title
          if (typeof title === 'string' && title.length > 0) {
            data.slug = formatSlug(title)
          }
        }
        if (data && !data.inviteToken && !originalDoc?.inviteToken) {
          data.inviteToken = randomBytes(12).toString('base64url')
        }
        return data
      },
    ],
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
      localized: true,
    },
    {
      name: 'slug',
      type: 'text',
      unique: true,
      index: true,
      admin: {
        position: 'sidebar',
        description: 'Auto-generated from the title if left empty.',
      },
    },
    {
      name: 'description',
      type: 'richText',
      localized: true,
    },
    {
      name: 'date',
      type: 'date',
      required: true,
      admin: {
        position: 'sidebar',
        date: {
          pickerAppearance: 'dayAndTime',
          displayFormat: 'dd.MM.yyyy HH:mm',
        },
      },
    },
    {
      name: 'endDate',
      type: 'date',
      admin: {
        position: 'sidebar',
        date: {
          pickerAppearance: 'dayAndTime',
          displayFormat: 'dd.MM.yyyy HH:mm',
        },
      },
    },
    {
      name: 'location',
      type: 'group',
      fields: [
        {
          name: 'name',
          type: 'text',
          admin: { description: 'e.g. "Chez Michael"' },
        },
        {
          name: 'address',
          type: 'text',
        },
        {
          name: 'mapsUrl',
          type: 'text',
          admin: { description: 'Google Maps / OpenStreetMap link' },
        },
      ],
    },
    {
      name: 'coverImage',
      type: 'upload',
      relationTo: 'media',
    },
    {
      // Single base color that drives the event's whole theme
      name: 'themeColor',
      type: 'text',
      validate: (value: string | null | undefined) =>
        !value || /^#[0-9a-fA-F]{6}$/.test(value) || 'Use a hex color like #a8f25a',
      admin: {
        position: 'sidebar',
        description: 'One color, e.g. #a8f25a — the event theme is derived from it.',
      },
    },
    {
      // The guest list: everyone who joined via this event's invite link.
      // Admins are implicit members of every event.
      name: 'members',
      type: 'relationship',
      relationTo: 'users',
      hasMany: true,
      index: true,
      access: {
        update: ({ req: { user } }) => user?.role === 'admin',
      },
      admin: { position: 'sidebar' },
    },
    {
      // The secret in the invite link (/join/<token>). Guests must not read it
      // via the API — knowing it is equivalent to holding an invitation.
      name: 'inviteToken',
      type: 'text',
      unique: true,
      index: true,
      access: {
        read: ({ req: { user } }) => user?.role === 'admin',
      },
      admin: {
        position: 'sidebar',
        description: 'Secret for the invite link. Auto-generated.',
      },
    },
    {
      name: 'photosOpen',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        position: 'sidebar',
        description:
          'Open the photo gallery for uploads. The gallery also opens automatically once the event has started.',
      },
    },
  ],
}
