import config from '@payload-config'
import type { Metadata } from 'next'
import { headers as getHeaders } from 'next/headers'
import { getPayload } from 'payload'
import React from 'react'

import { Story, storyCta } from '@/components/story/Story'
import { getDictionary } from '@/i18n/dictionaries'
import { getLocale } from '@/i18n/locale'
import { getStory } from '@/i18n/story'

export async function generateMetadata(): Promise<Metadata> {
  const t = getStory(await getLocale())
  return { title: t.metaTitle, description: t.metaDescription }
}

/**
 * The story, for anyone — logged-out visitors also get it as the landing
 * page, but guests who are already in should be able to read it too.
 */
export default async function AboutPage() {
  const locale = await getLocale()
  const t = getStory(locale)

  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await getHeaders() })

  return <Story t={t} footer={getDictionary(locale).footer} cta={storyCta(user, t)} />
}
