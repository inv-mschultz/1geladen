import type { CollectionConfig } from 'payload'

import { isPlatformAdmin } from '@/access'

/**
 * One row per device that said yes to notifications. Written and read only by
 * the server (lib/push.ts and the push actions) — the endpoint and keys are
 * as good as a password for that device's notification channel, so the API
 * hands them to nobody but the backstage.
 */
export const PushSubscriptions: CollectionConfig = {
  slug: 'push-subscriptions',
  admin: {
    defaultColumns: ['user', 'locale', 'createdAt'],
  },
  access: {
    read: isPlatformAdmin,
    create: () => false,
    update: () => false,
    delete: isPlatformAdmin,
  },
  fields: [
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
    },
    {
      name: 'endpoint',
      type: 'text',
      required: true,
      unique: true,
      index: true,
    },
    { name: 'p256dh', type: 'text', required: true },
    { name: 'auth', type: 'text', required: true },
    {
      // Which language to notify in. The UI language is a cookie, which a
      // notification sent from somebody else's request cannot see.
      name: 'locale',
      type: 'select',
      options: ['de', 'en'],
      defaultValue: 'de',
    },
  ],
}
