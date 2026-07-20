'use client'

import React, { useRef, useState, useTransition } from 'react'

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
  // `pending` is shared by every row, so track which control was actually
  // clicked ('add' or `${action}-${itemId}`) to spin only that one.
  const [busy, setBusy] = useState<string | null>(null)

  const run = (key: string, action: () => Promise<void>) => {
    setBusy(key)
    startTransition(async () => {
      await action()
      setBusy(null)
    })
  }

  const submit = (formData: FormData) => {
    const title = String(formData.get('title') ?? '')
    const note = String(formData.get('note') ?? '')
    if (!title.trim()) return
    run('add', async () => {
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
                {!item.claimedByName && <span className="bring__open">{dict.open}</span>}
              </div>
              <div className="bring__status">
                {item.claimedByName ? (
                  <span className="chip chip--claimed">
                    <Avatar name={item.claimedByName} size={22} host={item.claimedByName === hostName} />
                    <span className="chip__name">{item.claimedByName}</span> {dict.claimedBy}
                  </span>
                ) : (
                  <button
                    type="button"
                    className={`btn btn--small btn--claim ${
                      busy === `claim-${item.id}` ? 'is-loading' : ''
                    }`}
                    disabled={pending}
                    aria-busy={busy === `claim-${item.id}`}
                    onClick={() => run(`claim-${item.id}`, () => claimBringItem(item.id, true))}
                  >
                    <span className="btn__label">{dict.claim}</span>
                  </button>
                )}
                {item.claimedByMe && (
                  <button
                    type="button"
                    className={`btn-quiet ${busy === `unclaim-${item.id}` ? 'is-loading' : ''}`}
                    disabled={pending}
                    aria-busy={busy === `unclaim-${item.id}`}
                    aria-label={dict.unclaim}
                    title={dict.unclaim}
                    onClick={() => run(`unclaim-${item.id}`, () => claimBringItem(item.id, false))}
                  >
                    <X />
                  </button>
                )}
                {item.canDelete && (
                  <button
                    type="button"
                    className={`btn-quiet ${busy === `delete-${item.id}` ? 'is-loading' : ''}`}
                    disabled={pending}
                    aria-busy={busy === `delete-${item.id}`}
                    aria-label={dict.deleteItem}
                    title={dict.deleteItem}
                    onClick={() => run(`delete-${item.id}`, () => deleteBringItem(item.id))}
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
        <button
          type="submit"
          className={`btn btn--small ${busy === 'add' ? 'is-loading' : ''}`}
          disabled={pending}
          aria-busy={busy === 'add'}
        >
          <span className="btn__label">{dict.add}</span>
        </button>
      </form>
    </div>
  )
}
