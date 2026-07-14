'use client'

import { useRouter } from 'next/navigation'
import React, { useTransition } from 'react'

import { logout } from '@/app/(frontend)/actions'
import { Power } from './icons'

export function LogoutButton({ label }: { label: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  return (
    <button
      type="button"
      className="btn btn--icon"
      disabled={pending}
      aria-label={label}
      title={label}
      onClick={() =>
        startTransition(async () => {
          await logout()
          router.push('/')
          router.refresh()
        })
      }
    >
      <Power />
    </button>
  )
}
