'use client'

import { useRouter } from 'next/navigation'
import React, { useState } from 'react'

import type { Dictionary } from '@/i18n/dictionaries'

export function AuthForm({
  mode,
  dict,
  next = '/',
}: {
  mode: 'login' | 'register'
  dict: Dictionary['auth']
  next?: string
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setError(null)

    const form = new FormData(e.currentTarget)
    const email = String(form.get('email') ?? '')
    const password = String(form.get('password') ?? '')
    const name = String(form.get('name') ?? '')

    try {
      if (mode === 'register') {
        const res = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password }),
        })
        if (!res.ok) throw new Error('register-failed')
      }

      const login = await fetch('/api/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      if (!login.ok) throw new Error('login-failed')

      router.push(next)
      router.refresh()
    } catch {
      setError(mode === 'register' ? dict.errorRegister : dict.errorLogin)
      setBusy(false)
    }
  }

  return (
    <form className="auth-form" onSubmit={onSubmit}>
      {mode === 'register' && (
        <label className="field">
          <span>{dict.name}</span>
          <input name="name" type="text" required maxLength={80} className="input" autoComplete="name" />
        </label>
      )}
      <label className="field">
        <span>{dict.email}</span>
        <input name="email" type="email" required className="input" autoComplete="email" />
      </label>
      <label className="field">
        <span>{dict.password}</span>
        <input
          name="password"
          type="password"
          required
          minLength={6}
          className="input"
          autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
        />
      </label>

      {error && <p className="auth-form__error">{error}</p>}

      <button type="submit" className="btn btn--big btn--yes auth-form__submit" disabled={busy}>
        {mode === 'register' ? dict.register : dict.login}
      </button>
    </form>
  )
}
