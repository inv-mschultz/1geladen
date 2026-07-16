'use client'

import React, { useRef, useState, useTransition } from 'react'

import { createComment, createPost, deletePost, restorePost } from '@/app/(frontend)/actions'
import type { Dictionary, Locale } from '@/i18n/dictionaries'
import { resizeImage } from '@/lib/resizeImage'
import { Avatar } from './Avatar'
import { GifPicker } from './GifPicker'
import { ArrowUp, ImageIcon, Restore, Trash, X } from './icons'

export type WallComment = {
  id: number
  authorName: string
  content?: string | null
  imageUrl?: string | null
  gifUrl?: string | null
  createdAt: string
}

export type WallPost = {
  id: number
  authorName: string
  content?: string | null
  imageUrl?: string | null
  gifUrl?: string | null
  deleted: boolean
  mine: boolean
  createdAt: string
  comments: WallComment[]
}

type Attachment =
  | { kind: 'gif'; url: string; alt: string }
  | { kind: 'image'; file: File; previewUrl: string }

function useAttachment() {
  const [attachment, setAttachment] = useState<Attachment | null>(null)

  const attachGif = (url: string, alt: string) => setAttachment({ kind: 'gif', url, alt })
  const attachImage = async (file: File) => {
    const resized = await resizeImage(file)
    setAttachment({ kind: 'image', file: resized, previewUrl: URL.createObjectURL(resized) })
  }
  const clear = () => {
    if (attachment?.kind === 'image') URL.revokeObjectURL(attachment.previewUrl)
    setAttachment(null)
  }

  const appendTo = (formData: FormData) => {
    if (attachment?.kind === 'gif') formData.set('gifUrl', attachment.url)
    if (attachment?.kind === 'image') formData.set('photo', attachment.file)
  }

  return { attachment, attachGif, attachImage, clear, appendTo }
}

function AttachmentPreview({
  attachment,
  onRemove,
  dict,
}: {
  attachment: Attachment
  onRemove: () => void
  dict: Dictionary['wall']
}) {
  return (
    <div className="wall__attachment">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={attachment.kind === 'gif' ? attachment.url : attachment.previewUrl}
        alt={attachment.kind === 'gif' ? attachment.alt : attachment.file.name}
      />
      <button
        type="button"
        className="btn btn--icon wall__attachment-remove"
        aria-label={dict.removeAttachment}
        title={dict.removeAttachment}
        onClick={onRemove}
      >
        <X />
      </button>
    </div>
  )
}

function AttachButtons({
  onImage,
  onGifToggle,
  dict,
}: {
  onImage: (file: File) => void
  onGifToggle: () => void
  dict: Dictionary['wall']
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  return (
    <div className="wall__attach-buttons">
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="visually-hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) onImage(file)
          e.target.value = ''
        }}
      />
      <button
        type="button"
        className="btn btn--icon"
        aria-label={dict.attachImage}
        title={dict.attachImage}
        onClick={() => fileRef.current?.click()}
      >
        <ImageIcon />
      </button>
      <button
        type="button"
        className="btn btn--icon btn--gif"
        aria-label={dict.attachGif}
        title={dict.attachGif}
        onClick={onGifToggle}
      >
        GIF
      </button>
    </div>
  )
}

/** Casual timestamps: "vor 5 Minuten" → "Gestern, 15:24" → full date for older. */
function formatTime(iso: string, locale: Locale, dict: Dictionary['wall']): string {
  const intlLocale = locale === 'de' ? 'de-DE' : 'en-GB'
  const then = new Date(iso)
  const now = new Date()
  const minutes = Math.floor((now.getTime() - then.getTime()) / 60000)

  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)

  const clock = new Intl.DateTimeFormat(intlLocale, { hour: '2-digit', minute: '2-digit' }).format(then)

  if (minutes < 1) return dict.justNow

  if (sameDay(then, now)) {
    const rtf = new Intl.RelativeTimeFormat(intlLocale, { numeric: 'always' })
    return minutes < 60 ? rtf.format(-minutes, 'minute') : rtf.format(-Math.floor(minutes / 60), 'hour')
  }

  if (sameDay(then, yesterday)) return `${dict.yesterday}, ${clock}`

  return `${new Intl.DateTimeFormat(intlLocale, { day: '2-digit', month: '2-digit', year: 'numeric' }).format(then)}, ${clock}`
}

function PostMedia({ imageUrl, gifUrl }: { imageUrl?: string | null; gifUrl?: string | null }) {
  const src = gifUrl || imageUrl
  if (!src) return null
  return (
    <div className="wall__media">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" loading="lazy" />
    </div>
  )
}

function CommentForm({ postId, dict }: { postId: number; dict: Dictionary['wall'] }) {
  const [pending, startTransition] = useTransition()
  const [showGifs, setShowGifs] = useState(false)
  const [value, setValue] = useState('')
  const { attachment, attachGif, attachImage, clear, appendTo } = useAttachment()
  const fileRef = useRef<HTMLInputElement>(null)

  const canSend = Boolean(value.trim() || attachment)

  const submit = () => {
    if (!canSend || pending) return
    const formData = new FormData()
    formData.set('content', value.trim())
    appendTo(formData)
    startTransition(async () => {
      await createComment(postId, formData)
      setValue('')
      clear()
      setShowGifs(false)
    })
  }

  return (
    <div className="wall__comment-composer">
      {attachment && <AttachmentPreview attachment={attachment} onRemove={clear} dict={dict} />}
      {showGifs && (
        <GifPicker
          dict={dict}
          onClose={() => setShowGifs(false)}
          onPick={(url, alt) => {
            attachGif(url, alt)
            setShowGifs(false)
          }}
        />
      )}
      <form
        className="wall__comment-form"
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        <div className="input-shell">
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={dict.commentPlaceholder}
            maxLength={1000}
            className="input-shell__input"
          />
          <div className="input-shell__tools">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="visually-hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) attachImage(file)
                e.target.value = ''
              }}
            />
            <button
              type="button"
              className="btn-quiet"
              aria-label={dict.attachImage}
              title={dict.attachImage}
              onClick={() => fileRef.current?.click()}
            >
              <ImageIcon />
            </button>
            <button
              type="button"
              className="btn-quiet btn-quiet--gif"
              aria-label={dict.attachGif}
              title={dict.attachGif}
              onClick={() => setShowGifs((v) => !v)}
            >
              GIF
            </button>
          </div>
        </div>
        {canSend && (
          <button
            type="submit"
            className="btn btn--icon btn--send"
            disabled={pending}
            aria-label={dict.comment}
            title={dict.comment}
          >
            <ArrowUp />
          </button>
        )}
      </form>
    </div>
  )
}

export function Wall({
  eventId,
  posts,
  userName,
  isAdmin,
  locale,
  dict,
}: {
  eventId: number
  posts: WallPost[]
  userName: string
  isAdmin: boolean
  locale: Locale
  dict: Dictionary['wall']
}) {
  const [pending, startTransition] = useTransition()
  const [draft, setDraft] = useState('')
  const [showGifs, setShowGifs] = useState(false)
  const { attachment, attachGif, attachImage, clear, appendTo } = useAttachment()

  const submitPost = () => {
    if ((!draft.trim() && !attachment) || pending) return
    const formData = new FormData()
    formData.set('content', draft.trim())
    appendTo(formData)
    startTransition(async () => {
      await createPost(eventId, formData)
      setDraft('')
      clear()
      setShowGifs(false)
    })
  }

  return (
    <div className="wall">
      <div className="wall__composer">
        <Avatar name={userName} />
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={dict.placeholder}
          maxLength={2000}
          rows={3}
          className="input wall__textarea"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submitPost()
          }}
        />
        {attachment && (
          <div className="wall__composer-extra">
            <AttachmentPreview attachment={attachment} onRemove={clear} dict={dict} />
          </div>
        )}
        {showGifs && (
          <div className="wall__composer-extra">
            <GifPicker
              dict={dict}
              onClose={() => setShowGifs(false)}
              onPick={(url, alt) => {
                attachGif(url, alt)
                setShowGifs(false)
              }}
            />
          </div>
        )}
        <div className="wall__composer-actions">
          <AttachButtons onImage={attachImage} onGifToggle={() => setShowGifs((v) => !v)} dict={dict} />
          <button
            type="button"
            className="btn"
            disabled={pending || (!draft.trim() && !attachment)}
            onClick={submitPost}
          >
            {dict.post}
          </button>
        </div>
      </div>

      {posts.length === 0 ? (
        <p className="section__empty">{dict.empty}</p>
      ) : (
        <ul className="wall__posts">
          {posts.map((post) => (
            <li key={post.id} className={`wall__post ${post.deleted ? 'wall__post--deleted' : ''}`}>
              <div className="wall__post-head">
                <Avatar name={post.authorName} />
                <div className="wall__post-meta">
                  <strong>{post.authorName}</strong>
                  <time dateTime={post.createdAt} className="wall__time" suppressHydrationWarning>
                    {formatTime(post.createdAt, locale, dict)}
                  </time>
                </div>
                <div className="wall__post-actions">
                  {post.deleted && <span className="wall__deleted-badge">{dict.deletedBadge}</span>}
                  {post.deleted && isAdmin && (
                    <button
                      type="button"
                      className="btn-quiet"
                      disabled={pending}
                      aria-label={dict.restore}
                      title={dict.restore}
                      onClick={() => startTransition(() => restorePost(post.id))}
                    >
                      <Restore />
                    </button>
                  )}
                  {!post.deleted && (post.mine || isAdmin) && (
                    <button
                      type="button"
                      className="btn-quiet"
                      disabled={pending}
                      aria-label={dict.deletePost}
                      title={dict.deletePost}
                      onClick={() => startTransition(() => deletePost(post.id))}
                    >
                      <Trash />
                    </button>
                  )}
                </div>
              </div>
              {post.content && <p className="wall__content">{post.content}</p>}
              <PostMedia imageUrl={post.imageUrl} gifUrl={post.gifUrl} />

              {post.comments.length > 0 && (
                <ul className="wall__comments">
                  {post.comments.map((comment) => (
                    <li key={comment.id} className="wall__comment">
                      <Avatar name={comment.authorName} size={24} />
                      <div className="wall__comment-body">
                        <div className="wall__comment-head">
                          <strong>{comment.authorName}</strong>
                          <time dateTime={comment.createdAt} className="wall__time" suppressHydrationWarning>
                            {formatTime(comment.createdAt, locale, dict)}
                          </time>
                        </div>
                        {comment.content && <p className="wall__comment-text">{comment.content}</p>}
                        {(comment.gifUrl || comment.imageUrl) && (
                          <div className="wall__comment-media">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={comment.gifUrl || comment.imageUrl || ''} alt="" loading="lazy" />
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              {!post.deleted && <CommentForm postId={post.id} dict={dict} />}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
