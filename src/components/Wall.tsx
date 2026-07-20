'use client'

import React, { useMemo, useOptimistic, useRef, useState, useTransition } from 'react'

import {
  createComment,
  createPost,
  deleteComment,
  deletePost,
  loadOlderPosts,
  restorePost,
  toggleReaction,
} from '@/app/(frontend)/actions'
import type { Dictionary, Locale } from '@/i18n/dictionaries'
import { resizeImage } from '@/lib/resizeImage'
import { Avatar } from './Avatar'
import { EmojiPicker } from './EmojiPicker'
import { GifPicker } from './GifPicker'
import { ArrowUp, ImageIcon, Restore, Smiley, Trash, X } from './icons'

/** One emoji on one post or comment, already aggregated across guests. */
export type WallReaction = {
  emoji: string
  count: number
  /** The viewer is among the reactors — their pill is highlighted and toggles off. */
  mine: boolean
}

export type WallComment = {
  id: number
  authorName: string
  content?: string | null
  imageUrl?: string | null
  gifUrl?: string | null
  createdAt: string
  /** Written by the viewer — only they (and admins) get the delete button. */
  mine: boolean
  reactions: WallReaction[]
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
  reactions: WallReaction[]
}

type OptimisticAction =
  | { type: 'post'; post: WallPost }
  | { type: 'comment'; postId: number; comment: WallComment }
  | { type: 'delete-comment'; commentId: number }
  | { type: 'react'; target: ReactionTarget; emoji: string }

export type ReactionTarget = { kind: 'post' | 'comment'; id: number }

type Attachment =
  | { kind: 'gif'; url: string; alt: string }
  | { kind: 'image'; file: File; previewUrl: string }

/**
 * Applies the viewer's toggle to an aggregated list: their own reaction flips
 * off (count down), anything else flips on (count up, appended if new).
 */
function toggleReactionList(reactions: WallReaction[], emoji: string): WallReaction[] {
  const existing = reactions.find((reaction) => reaction.emoji === emoji)
  if (!existing) return [...reactions, { emoji, count: 1, mine: true }]
  return reactions.map((reaction) =>
    reaction.emoji === emoji
      ? { ...reaction, count: reaction.count + (reaction.mine ? -1 : 1), mine: !reaction.mine }
      : reaction,
  )
}

/** Optimistic rows get negative ids so they can never collide with real ones. */
let optimisticIdSeq = -1
const nextOptimisticId = () => optimisticIdSeq--

/** Show the attachment straight from the local preview while it uploads. */
const optimisticMedia = (attachment: Attachment | null): { gifUrl?: string; imageUrl?: string } => {
  if (attachment?.kind === 'gif') return { gifUrl: attachment.url }
  if (attachment?.kind === 'image') return { imageUrl: attachment.previewUrl }
  return {}
}

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
  onEmojiToggle,
  dict,
}: {
  onImage: (file: File) => void
  onGifToggle: () => void
  onEmojiToggle: () => void
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
        className="btn btn--icon"
        aria-label={dict.addEmoji}
        title={dict.addEmoji}
        onClick={onEmojiToggle}
      >
        <Smiley />
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

/**
 * Inserts an emoji at the caret rather than appending it, and puts the caret
 * back after it — appending feels broken the moment someone edits mid-sentence.
 */
function useEmojiInsert<T extends HTMLInputElement | HTMLTextAreaElement>(
  setValue: React.Dispatch<React.SetStateAction<string>>,
) {
  const ref = useRef<T>(null)

  const insert = (emoji: string) => {
    const field = ref.current
    if (!field) {
      setValue((prev) => prev + emoji)
      return
    }
    const start = field.selectionStart ?? field.value.length
    const end = field.selectionEnd ?? start
    setValue((prev) => prev.slice(0, start) + emoji + prev.slice(end))
    // The value lands on the next render; move the caret once it has.
    requestAnimationFrame(() => {
      field.focus()
      const caret = start + emoji.length
      field.setSelectionRange(caret, caret)
    })
  }

  return { ref, insert }
}

/**
 * Reaction pills plus an "add" button that opens the same picker the composers
 * use. Counts come pre-aggregated; this only renders and toggles them.
 */
function Reactions({
  reactions,
  target,
  onToggle,
  disabled,
  dict,
}: {
  reactions: WallReaction[]
  target: ReactionTarget
  onToggle: (target: ReactionTarget, emoji: string) => void
  disabled: boolean
  dict: Dictionary['wall']
}) {
  const [showPicker, setShowPicker] = useState(false)

  // Optimistic toggles can drop a pill to zero before the server confirms.
  const visible = reactions.filter((reaction) => reaction.count > 0)

  return (
    <>
      <div className="reactions">
        {visible.map((reaction) => (
          <button
            key={reaction.emoji}
            type="button"
            className={`reactions__pill ${reaction.mine ? 'is-mine' : ''}`}
            disabled={disabled}
            aria-pressed={reaction.mine}
            title={`${dict.reactionBy} ${reaction.count}`}
            onClick={() => onToggle(target, reaction.emoji)}
          >
            <span className="reactions__emoji">{reaction.emoji}</span>
            <span className="reactions__count">{reaction.count}</span>
          </button>
        ))}
        <button
          type="button"
          className="reactions__add"
          disabled={disabled}
          aria-label={dict.react}
          title={dict.react}
          onClick={() => setShowPicker((v) => !v)}
        >
          <Smiley />
        </button>
      </div>
      {showPicker && (
        <div className="reactions__picker">
          <EmojiPicker
            dict={dict}
            onClose={() => setShowPicker(false)}
            onPick={(emoji) => {
              onToggle(target, emoji)
              setShowPicker(false)
            }}
          />
        </div>
      )}
    </>
  )
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

function CommentForm({
  postId,
  userName,
  dict,
  onOptimistic,
}: {
  postId: number
  userName: string
  dict: Dictionary['wall']
  onOptimistic: (postId: number, comment: WallComment) => void
}) {
  const [pending, startTransition] = useTransition()
  const [showGifs, setShowGifs] = useState(false)
  const [showEmoji, setShowEmoji] = useState(false)
  const [value, setValue] = useState('')
  const { attachment, attachGif, attachImage, clear, appendTo } = useAttachment()
  const fileRef = useRef<HTMLInputElement>(null)
  const { ref: inputRef, insert: insertEmoji } = useEmojiInsert<HTMLInputElement>(setValue)

  const canSend = Boolean(value.trim() || attachment)

  const submit = () => {
    if (!canSend || pending) return
    const formData = new FormData()
    const content = value.trim()
    formData.set('content', content)
    appendTo(formData)
    const preview = optimisticMedia(attachment)
    // Clear the field immediately — the optimistic comment already shows the text
    setValue('')
    setShowGifs(false)
    startTransition(async () => {
      onOptimistic(postId, {
        id: nextOptimisticId(),
        authorName: userName,
        content: content || undefined,
        createdAt: new Date().toISOString(),
        mine: true,
        reactions: [],
        ...preview,
      })
      await createComment(postId, formData)
      clear()
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
      {showEmoji && (
        <EmojiPicker
          dict={dict}
          onClose={() => setShowEmoji(false)}
          onPick={(emoji) => insertEmoji(emoji)}
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
            ref={inputRef}
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
              className="btn-quiet"
              aria-label={dict.addEmoji}
              title={dict.addEmoji}
              onClick={() => {
                setShowEmoji((v) => !v)
                setShowGifs(false)
              }}
            >
              <Smiley />
            </button>
            <button
              type="button"
              className="btn-quiet btn-quiet--gif"
              aria-label={dict.attachGif}
              title={dict.attachGif}
              onClick={() => {
                setShowGifs((v) => !v)
                setShowEmoji(false)
              }}
            >
              GIF
            </button>
          </div>
        </div>
        {canSend && (
          <button
            type="submit"
            className={`btn btn--icon btn--send ${pending ? 'is-loading' : ''}`}
            disabled={pending}
            aria-busy={pending}
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
  hasMore,
  userName,
  hostName,
  isAdmin,
  locale,
  dict,
}: {
  eventId: number
  posts: WallPost[]
  hasMore: boolean
  userName: string
  hostName?: string | null
  isAdmin: boolean
  locale: Locale
  dict: Dictionary['wall']
}) {
  const [pending, startTransition] = useTransition()
  const [draft, setDraft] = useState('')
  const [posting, setPosting] = useState(false)
  const [showGifs, setShowGifs] = useState(false)
  const [showEmoji, setShowEmoji] = useState(false)
  const { attachment, attachGif, attachImage, clear, appendTo } = useAttachment()
  const { ref: draftRef, insert: insertEmoji } = useEmojiInsert<HTMLTextAreaElement>(setDraft)

  // Older pages pulled on demand. `posts` stays the server's freshest window,
  // so dedupe by id — a new post can push an older one across the page edge.
  const [older, setOlder] = useState<WallPost[]>([])
  const [moreAvailable, setMoreAvailable] = useState(hasMore)
  const [loadingOlder, setLoadingOlder] = useState(false)

  const allPosts = useMemo(() => {
    const seen = new Set(posts.map((post) => post.id))
    return [...posts, ...older.filter((post) => !seen.has(post.id))]
  }, [posts, older])

  const showOlder = () => {
    const oldest = allPosts[allPosts.length - 1]
    if (!oldest || loadingOlder) return
    setLoadingOlder(true)
    startTransition(async () => {
      const result = await loadOlderPosts(eventId, oldest.createdAt)
      setOlder((prev) => [...prev, ...result.posts])
      setMoreAvailable(result.hasMore)
      setLoadingOlder(false)
    })
  }

  // New posts/comments render immediately and are replaced by the server's
  // version when the action's revalidation lands.
  const [optimisticPosts, applyOptimistic] = useOptimistic(
    allPosts,
    (state: WallPost[], action: OptimisticAction): WallPost[] => {
      if (action.type === 'post') return [action.post, ...state]
      if (action.type === 'delete-comment')
        return state.map((post) => ({
          ...post,
          comments: post.comments.filter((comment) => comment.id !== action.commentId),
        }))
      if (action.type === 'react') {
        const { target, emoji } = action
        return state.map((post) => {
          if (target.kind === 'post') {
            return post.id === target.id
              ? { ...post, reactions: toggleReactionList(post.reactions, emoji) }
              : post
          }
          if (!post.comments.some((comment) => comment.id === target.id)) return post
          return {
            ...post,
            comments: post.comments.map((comment) =>
              comment.id === target.id
                ? { ...comment, reactions: toggleReactionList(comment.reactions, emoji) }
                : comment,
            ),
          }
        })
      }
      return state.map((post) =>
        post.id === action.postId
          ? { ...post, comments: [...post.comments, action.comment] }
          : post,
      )
    },
  )

  const addOptimisticComment = (postId: number, comment: WallComment) =>
    applyOptimistic({ type: 'comment', postId, comment })

  const react = (target: ReactionTarget, emoji: string) => {
    // Optimistic rows have negative ids and don't exist server-side yet.
    if (target.id < 0 || pending) return
    startTransition(async () => {
      applyOptimistic({ type: 'react', target, emoji })
      try {
        await toggleReaction(target, emoji)
      } catch {
        // Rejected (or already toggled elsewhere) — the optimistic state reverts
        // on its own and revalidation restores the server's truth.
      }
    })
  }

  const removeComment = (commentId: number) => {
    if (pending) return
    startTransition(async () => {
      applyOptimistic({ type: 'delete-comment', commentId })
      try {
        await deleteComment(commentId)
      } catch {
        // Server said no (or it was already gone) — the optimistic removal
        // reverts on its own and revalidation restores the truth.
      }
    })
  }

  const submitPost = () => {
    if ((!draft.trim() && !attachment) || pending) return
    const formData = new FormData()
    const content = draft.trim()
    formData.set('content', content)
    appendTo(formData)
    const preview = optimisticMedia(attachment)
    // Empty the composer right away — the optimistic post already shows it
    setDraft('')
    setShowGifs(false)
    setPosting(true)
    startTransition(async () => {
      applyOptimistic({
        type: 'post',
        post: {
          id: nextOptimisticId(),
          authorName: userName,
          content: content || undefined,
          deleted: false,
          mine: true,
          createdAt: new Date().toISOString(),
          comments: [],
          reactions: [],
          ...preview,
        },
      })
      await createPost(eventId, formData)
      clear()
      setPosting(false)
    })
  }

  return (
    <div className="wall">
      <div className="wall__composer">
        <Avatar name={userName} host={userName === hostName} />
        <textarea
          ref={draftRef}
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
        {showEmoji && (
          <div className="wall__composer-extra">
            <EmojiPicker
              dict={dict}
              onClose={() => setShowEmoji(false)}
              onPick={(emoji) => insertEmoji(emoji)}
            />
          </div>
        )}
        <div className="wall__composer-actions">
          <AttachButtons
            onImage={attachImage}
            onGifToggle={() => {
              setShowGifs((v) => !v)
              setShowEmoji(false)
            }}
            onEmojiToggle={() => {
              setShowEmoji((v) => !v)
              setShowGifs(false)
            }}
            dict={dict}
          />
          <button
            type="button"
            className={`btn ${posting ? 'is-loading' : ''}`}
            disabled={pending || (!draft.trim() && !attachment)}
            aria-busy={posting}
            onClick={submitPost}
          >
            <span className="btn__label">{dict.post}</span>
          </button>
        </div>
      </div>

      {optimisticPosts.length === 0 ? (
        <p className="section__empty">{dict.empty}</p>
      ) : (
        <ul className="wall__posts">
          {optimisticPosts.map((post) => (
            <li key={post.id} className={`wall__post ${post.deleted ? 'wall__post--deleted' : ''}`}>
              <div className="wall__post-head">
                <Avatar name={post.authorName} host={post.authorName === hostName} />
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
                  {!post.deleted && post.id > 0 && (post.mine || isAdmin) && (
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

              {!post.deleted && (
                <Reactions
                  reactions={post.reactions}
                  target={{ kind: 'post', id: post.id }}
                  onToggle={react}
                  disabled={pending || post.id < 0}
                  dict={dict}
                />
              )}

              {post.comments.length > 0 && (
                <ul className="wall__comments">
                  {post.comments.map((comment) => (
                    <li key={comment.id} className="wall__comment">
                      <Avatar name={comment.authorName} size={24} host={comment.authorName === hostName} />
                      <div className="wall__comment-body">
                        <div className="wall__comment-head">
                          <strong>{comment.authorName}</strong>
                          <time dateTime={comment.createdAt} className="wall__time" suppressHydrationWarning>
                            {formatTime(comment.createdAt, locale, dict)}
                          </time>
                          {comment.id > 0 && (comment.mine || isAdmin) && (
                            <button
                              type="button"
                              className="btn-quiet wall__comment-delete"
                              disabled={pending}
                              aria-label={dict.deleteComment}
                              title={dict.deleteComment}
                              onClick={() => removeComment(comment.id)}
                            >
                              <Trash />
                            </button>
                          )}
                        </div>
                        {comment.content && <p className="wall__comment-text">{comment.content}</p>}
                        {(comment.gifUrl || comment.imageUrl) && (
                          <div className="wall__comment-media">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={comment.gifUrl || comment.imageUrl || ''} alt="" loading="lazy" />
                          </div>
                        )}
                        <Reactions
                          reactions={comment.reactions}
                          target={{ kind: 'comment', id: comment.id }}
                          onToggle={react}
                          disabled={pending || comment.id < 0}
                          dict={dict}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              {!post.deleted && post.id > 0 && (
                <CommentForm
                  postId={post.id}
                  userName={userName}
                  dict={dict}
                  onOptimistic={addOptimisticComment}
                />
              )}
            </li>
          ))}
        </ul>
      )}

      {moreAvailable && (
        <div className="load-more">
          <button
            type="button"
            className={`btn btn--ghost btn--small ${loadingOlder ? 'is-loading' : ''}`}
            disabled={loadingOlder}
            aria-busy={loadingOlder}
            onClick={showOlder}
          >
            <span className="btn__label">{dict.loadOlder}</span>
          </button>
        </div>
      )}
    </div>
  )
}
