import config from '@payload-config'
import { getPayload } from 'payload'

import { retireDueGalleries } from '@/lib/retireGalleries'

/**
 * Called once a day by Vercel Cron (see vercel.json). Vercel sends
 * `Authorization: Bearer $CRON_SECRET`; without that env var set the route
 * refuses everyone, so it can't be triggered from outside by accident.
 */
export async function GET(request: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const payload = await getPayload({ config })
  const result = await retireDueGalleries(payload)
  payload.logger.info({ msg: 'retired galleries', ...result })
  return Response.json(result)
}
