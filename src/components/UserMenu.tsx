'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import React, { useEffect, useRef, useState, useTransition } from 'react'

import { logout } from '@/app/(frontend)/actions'
import type { Locale } from '@/i18n/dictionaries'
import { Avatar } from './Avatar'
import { ChevronDown, Power } from './icons'
import { LangSwitch } from './LangSwitch'

export function UserMenu({
  name,
  isAdmin,
  locale,
  labels,
}: {
  name: string
  isAdmin: boolean
  locale: Locale
  labels: { account: string; admin: string; language: string; logout: string }
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div className="user-menu" ref={ref}>
      <button
        type="button"
        className="chip user-menu__trigger"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
      >
        <Avatar name={name} size={24} />
        {name}
        <ChevronDown />
      </button>

      {open && (
        <div className="user-menu__panel" role="menu">
          <Link href="/account" className="user-menu__item" onClick={() => setOpen(false)}>
            {labels.account}
          </Link>
          {isAdmin && (
            <a
              href="/admin"
              target="_blank"
              rel="noopener noreferrer"
              className="user-menu__item"
              onClick={() => setOpen(false)}
            >
              {labels.admin}
            </a>
          )}
          <div className="user-menu__divider" />
          <div className="user-menu__row">
            <span>{labels.language}</span>
            <LangSwitch current={locale} />
          </div>
          <div className="user-menu__divider" />
          <button
            type="button"
            className="user-menu__item"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await logout()
                setOpen(false)
                router.push('/')
                router.refresh()
              })
            }
          >
            <Power /> {labels.logout}
          </button>
        </div>
      )}
    </div>
  )
}
