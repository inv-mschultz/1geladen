'use client'

import React, { useRef, useTransition } from 'react'

import { addBringItem, claimBringItem, deleteBringItem } from '@/app/(frontend)/actions'
import type { Dictionary } from '@/i18n/dictionaries'
import { Avatar } from './Avatar'
import { Trash, X } from './icons'

export type BringListItem = {
  id: number
  title: string
  note?: string | null
  claimedByName?: string | null
  claimedByMe: boolean
  canDelete: boolean
}

export function BringList({
  eventId,
  items,
  hostName,
  dict,
}: {
  eventId: number
  items: BringListItem[]
  hostName?: string | null
  dict: Dictionary['bring']
}) {
  const [pending, startTransition] = useTransition()
  const formRef = useRef<HTMLFormElement>(null)

  const submit = (formData: FormData) => {
    const title = String(formData.get('title') ?? '')
    const note = String(formData.get('note') ?? '')
    if (!title.trim()) return
    startTransition(async () => {
      await addBringItem(eventId, title, note)
      formRef.current?.reset()
    })
  }

  return (
    <div className="bring">
      {items.length === 0 ? (
        <p className="section__empty">{dict.empty}</p>
      ) : (
        <ul className="bring__list">
          {items.map((item) => (
            <li key={item.id} className={`bring__item ${item.claimedByName ? 'is-claimed' : ''}`}>
              <div className="bring__info">
                <span className="bring__title">{item.title}</span>
                {item.note && <span className="bring__note">{item.note}</span>}
              </div>
              <div className="bring__status">
                {item.claimedByName ? (
                  <span className="chip chip--claimed">
                    <Avatar name={item.claimedByName} size={22} host={item.claimedByName === hostName} />
                    <span className="chip__name">{item.claimedByName}</span> {dict.claimedBy}
                  </span>
                ) : (
                  <>
                    <span className="bring__open">{dict.open}</span>
                    <button
                      type="button"
                      className="btn btn--small btn--claim"
                      disabled={pending}
                      onClick={() => startTransition(() => claimBringItem(item.id, true))}
                    >
                      {dict.claim}
                    </button>
                  </>
                )}
                {item.claimedByMe && (
                  <button
                    type="button"
                    className="btn-quiet"
                    disabled={pending}
                    aria-label={dict.unclaim}
                    title={dict.unclaim}
                    onClick={() => startTransition(() => claimBringItem(item.id, false))}
                  >
                    <X />
                  </button>
                )}
                {item.canDelete && (
                  <button
                    type="button"
                    className="btn-quiet"
                    disabled={pending}
                    aria-label={dict.deleteItem}
                    title={dict.deleteItem}
                    onClick={() => startTransition(() => deleteBringItem(item.id))}
                  >
                    <Trash />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <form ref={formRef} action={submit} className="bring__add">
        <input
          name="title"
          type="text"
          placeholder={dict.addPlaceholder}
          maxLength={120}
          required
          className="input"
        />
        <input name="note" type="text" placeholder={dict.addNote} maxLength={200} className="input" />
        <button type="submit" className="btn btn--small" disabled={pending}>
          {dict.add}
        </button>
      </form>
    </div>
  )
}
