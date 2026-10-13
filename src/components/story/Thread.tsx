import React from 'react'

import type { StoryCopy } from '@/i18n/story'

const TONES: Record<string, string> = {
  Jonas: '#ffd36e',
  Lena: '#ff8ad4',
  Tobi: '#4ce6a5',
  Mia: '#8ad8ff',
}

const Avatar = ({ name }: { name: string }) => (
  <span className="story-thread__avatar" style={{ background: TONES[name] ?? '#a58bff' }} aria-hidden>
    {name[0]}
  </span>
)

/** A GIF stand-in: a looping emoji on a gradient, so no third-party GIF is loaded. */
const Gif = ({ emoji, label }: { emoji: string; label: string }) => (
  <span className="story-thread__gif" aria-hidden>
    <span className="story-thread__gif-emoji">{emoji}</span>
    <span className="story-thread__gif-badge">{label}</span>
  </span>
)

/**
 * A wall thread that builds itself as you scroll: the post, then the
 * reactions popping in one by one, then the comments — one of them a GIF.
 * Every piece has a step `--n`; story.css shows it once the chapter's `--p`
 * gets there.
 */
export function Thread({ t }: { t: StoryCopy['wall'] }) {
  let step = 0
  const at = () => ({ '--n': step++ }) as React.CSSProperties

  return (
    <article className="story-thread">
      <div className="story-thread__post story-thread__in" style={at()}>
        <header className="story-thread__head">
          <Avatar name={t.post.author} />
          <strong>{t.post.author}</strong>
          <span>{t.post.time}</span>
        </header>
        <p className="story-thread__text">{t.post.text}</p>
        <ul className="story-thread__reactions">
          {t.reactions.map((reaction) => (
            <li key={reaction.emoji} className="story-thread__pop" style={at()}>
              <span aria-hidden>{reaction.emoji}</span> {reaction.count}
            </li>
          ))}
        </ul>
      </div>

      <ul className="story-thread__comments">
        {t.comments.map((comment) => (
          <li key={comment.author} className="story-thread__comment story-thread__in" style={at()}>
            <Avatar name={comment.author} />
            <div className="story-thread__bubble">
              <header className="story-thread__head">
                <strong>{comment.author}</strong>
                <span>{comment.time}</span>
              </header>
              {comment.text && <p className="story-thread__text">{comment.text}</p>}
              {comment.gif && <Gif emoji={comment.gif} label={t.gif} />}
            </div>
          </li>
        ))}
      </ul>
    </article>
  )
}
