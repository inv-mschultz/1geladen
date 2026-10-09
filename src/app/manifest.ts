import type { MetadataRoute } from 'next'

import { BRAND_BG } from '@/lib/brand'

/**
 * Makes 1geladen installable from the browser ("Zum Home-Bildschirm"). Served
 * at /manifest.webmanifest; the frontend layout links it.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: '1geladen',
    short_name: '1geladen',
    description: 'Events organisieren wie 2010. Nur besser.',
    lang: 'de',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: BRAND_BG,
    theme_color: BRAND_BG,
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
