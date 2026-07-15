/**
 * Seeds a demo party so the app isn't an empty room with the lights on.
 * Run with: pnpm payload run scripts/seed.ts
 */
import config from '@payload-config'
import { getPayload } from 'payload'

const richText = (text: string) => ({
  root: {
    type: 'root' as const,
    format: '' as const,
    indent: 0,
    version: 1,
    direction: 'ltr' as const,
    children: [
      {
        type: 'paragraph',
        format: '' as const,
        indent: 0,
        version: 1,
        direction: 'ltr' as const,
        children: [{ type: 'text', text, version: 1 }],
      },
    ],
  },
})

async function seed() {
  const payload = await getPayload({ config })

  const existing = await payload.count({ collection: 'users' })
  if (existing.totalDocs > 0) {
    payload.logger.info('Users already exist — skipping seed. (The party has already started.)')
    process.exit(0)
  }

  payload.logger.info('Seeding the partey…')

  const admin = await payload.create({
    collection: 'users',
    data: {
      name: 'Michael',
      email: 'michael@inversestudio.io',
      password: 'partey2010',
      role: 'admin',
    },
  })

  const [anna, ben, clara] = await Promise.all(
    [
      { name: 'Anna', email: 'anna@example.com' },
      { name: 'Ben', email: 'ben@example.com' },
      { name: 'Clara', email: 'clara@example.com' },
    ].map((guest) =>
      payload.create({
        collection: 'users',
        data: { ...guest, password: 'partey2010', role: 'guest' as const },
      }),
    ),
  )

  const eventDate = new Date()
  eventDate.setDate(eventDate.getDate() + 11)
  eventDate.setHours(19, 0, 0, 0)

  const event = await payload.create({
    collection: 'events',
    locale: 'de',
    data: {
      title: 'Spaghetti-Abend bei Michael',
      slug: 'spaghetti-abend',
      members: [admin.id, anna.id, ben.id, clara.id],
      date: eventDate.toISOString(),
      location: {
        name: 'Bei Michael',
        address: 'Musterstraße 12, Berlin',
        mapsUrl: 'https://maps.google.com/?q=Berlin',
      },
      description: richText(
        'Es gibt drei Sorten Pasta, eine davon ist geheim. Kommt hungrig, geht glücklich. Musikwünsche werden wohlwollend geprüft und dann trotzdem abgelehnt.',
      ),
    },
  })

  await payload.update({
    collection: 'events',
    id: event.id,
    locale: 'en',
    data: {
      title: 'Spaghetti Night at Michael’s',
      description: richText(
        'Three kinds of pasta, one of them classified. Arrive hungry, leave happy. Song requests will be reviewed kindly and rejected anyway.',
      ),
    },
  })

  await Promise.all([
    payload.create({
      collection: 'rsvps',
      data: { event: event.id, user: anna.id, status: 'yes' },
    }),
    payload.create({
      collection: 'rsvps',
      data: { event: event.id, user: ben.id, status: 'maybe' },
    }),
    payload.create({
      collection: 'rsvps',
      data: { event: event.id, user: clara.id, status: 'yes' },
    }),
  ])

  await Promise.all([
    payload.create({
      collection: 'bring-items',
      data: {
        event: event.id,
        title: 'Kartoffelsalat',
        note: 'Ja, zu Spaghetti. Tradition ist Tradition.',
        claimedBy: anna.id,
        createdBy: admin.id,
      },
    }),
    payload.create({
      collection: 'bring-items',
      data: {
        event: event.id,
        title: 'Rotwein',
        note: '2 Flaschen reichen. Sagt niemand.',
        createdBy: admin.id,
      },
    }),
    payload.create({
      collection: 'bring-items',
      data: {
        event: event.id,
        title: 'Nachtisch',
        createdBy: clara.id,
        claimedBy: clara.id,
      },
    }),
    payload.create({
      collection: 'bring-items',
      data: { event: event.id, title: 'Gute Laune', createdBy: admin.id },
    }),
  ])

  const post = await payload.create({
    collection: 'posts',
    data: {
      event: event.id,
      author: anna.id,
      content: 'Ich bin SO bereit. Welche Pastasorte ist denn die geheime? 👀',
    },
  })

  await payload.create({
    collection: 'comments',
    data: {
      post: post.id,
      author: admin.id,
      content: 'Wenn ich das verrate, ist sie nicht mehr geheim. Nice try, Anna.',
    },
  })

  await payload.create({
    collection: 'posts',
    data: {
      event: event.id,
      author: ben.id,
      content: 'Kann jemand mich mitnehmen? Komme aus Kreuzberg. Biete dafür Beifahrer-DJ-Dienste an.',
    },
  })

  payload.logger.info('Done! Admin login: michael@inversestudio.io / partey2010')
  process.exit(0)
}

seed().catch((error) => {
  console.error(error)
  process.exit(1)
})
