import type { Metadata } from 'next'

import type { Locale } from '@/i18n/dictionaries'

/**
 * Title, description and the link-preview tags that go with them. The preview
 * image is `opengraph-image.png` next to the frontend layout; Next adds it.
 */
export function shareMetadata(title: string, description: string, locale: Locale): Metadata {
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      siteName: '1geladen',
      type: 'website',
      locale: locale === 'de' ? 'de_DE' : 'en_US',
      alternateLocale: locale === 'de' ? 'en_US' : 'de_DE',
    },
    twitter: { card: 'summary_large_image', title, description },
  }
}
