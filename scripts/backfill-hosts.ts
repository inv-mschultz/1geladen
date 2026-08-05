/**
 * Gives every event a host.
 *
 * Local dev runs on SQLite in push mode, which never executes anything in
 * src/migrations — so the Postgres backfill in 20260805_101500_per_event_hosts
 * does not reach your partey.db. This is the same logic through the Local API.
 *
 * Also the repair tool: idempotent, safe to re-run anywhere, and the answer to
 * "nobody can open this event". Run with: pnpm backfill:hosts
 */
import config from '@payload-config'
import { getPayload } from 'payload'

import { relId, toIds } from '../src/access'

async function backfill() {
  const payload = await getPayload({ config })

  const { docs: events } = await payload.find({
    collection: 'events',
    limit: 1000,
    depth: 0,
    overrideAccess: true,
  })

  // The same fallback the migration uses: creator, then first member, then the
  // oldest admin — whoever the first-user hook promoted at the very beginning.
  const { docs: admins } = await payload.find({
    collection: 'users',
    where: { role: { equals: 'admin' } },
    sort: 'id',
    limit: 1,
    depth: 0,
    overrideAccess: true,
  })
  const oldestAdmin = admins[0]?.id ?? null

  let hosted = 0
  let skipped = 0
  const orphans: number[] = []

  for (const event of events) {
    if (toIds(event.hosts).length > 0) {
      skipped++
      continue
    }

    const host = relId(event.createdBy) ?? toIds(event.members)[0] ?? oldestAdmin
    if (!host) {
      orphans.push(event.id)
      continue
    }

    // The beforeValidate hook unions hosts into members, so the guest list
    // stays consistent without a second write here.
    await payload.update({
      collection: 'events',
      id: event.id,
      data: { hosts: [host] },
      overrideAccess: true,
    })
    hosted++
    payload.logger.info(`event ${event.id} (${event.slug ?? 'no slug'}) → host ${host}`)
  }

  payload.logger.info(`Done. ${hosted} backfilled, ${skipped} already hosted.`)
  if (orphans.length > 0) {
    payload.logger.error(
      `No host candidate for events: ${orphans.join(', ')}. ` +
        `These are unreachable until someone is assigned by hand.`,
    )
    process.exit(1)
  }
  process.exit(0)
}

backfill().catch((error) => {
  console.error(error)
  process.exit(1)
})
