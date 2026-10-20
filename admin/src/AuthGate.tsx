import { useEffect, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import type { SupabaseClient, User } from '@supabase/supabase-js'
import { supabase } from './supabase'
import type { AdminProfile } from './supabase'

export type AuthenticatedAdmin = {
  client: SupabaseClient
  profile: AdminProfile
  user: User
  signOut: () => Promise<void>
}

type AuthGateProps = {
  children: (admin: AuthenticatedAdmin) => ReactNode
}

export function AuthGate({ children }: AuthGateProps) {
  const client = supabase
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<AdminProfile | null>(null)
  const [sessionReady, setSessionReady] = useState(!client)
  const [profileReady, setProfileReady] = useState(false)
  const [profileError, setProfileError] = useState('')
  const [pathname, setPathname] = useState(window.location.pathname)

  useEffect(() => {
    if (!client) return
    let active = true

    client.auth.getSession().then(({ data, error }) => {
      if (!active) return
      if (error) setProfileError(error.message)
      setUser(data.session?.user ?? null)
      setProfileReady(false)
      setSessionReady(true)
    })
      .catch((error: unknown) => {
        if (!active) return
        setProfileError(error instanceof Error ? error.message : 'Unable to read the current login session.')
        setSessionReady(true)
      })

    const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setProfile(null)
      setProfileReady(false)
      setProfileError('')
      setSessionReady(true)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [client])

  useEffect(() => {
    if (!client || !user) {
      return
    }

    let active = true
    const loadProfile = async () => {
      try {
        const { data, error } = await client
          .from('profiles')
          .select('id, full_name, role, permissions, is_active')
          .eq('id', user.id)
          .maybeSingle()
        if (!active) return
        if (error) {
          setProfileError(error.message)
          setProfile(null)
        } else if (data && isAdminProfile(data)) {
          setProfile(data)
        } else {
          setProfile(null)
        }
        setProfileReady(true)
      } catch (error) {
        if (!active) return
        setProfileError(error instanceof Error ? error.message : 'Unable to check administrator access.')
        setProfile(null)
        setProfileReady(true)
      }
    }
    void loadProfile()

    return () => { active = false }
  }, [client, user])

  if (!client) return <AuthMessage />
  if (!sessionReady || (user !== null && !profileReady)) return <AuthMessage message="Checking your secure admin session…" />

  const isPasswordSetup = pathname === '/admin/set-password'
  if (isPasswordSetup) {
    return user
      ? <SetPassword onComplete={() => { window.history.replaceState({}, '', '/admin/'); setPathname('/admin/') }} />
      : <AuthMessage message="This invitation link is invalid, expired, or already used. Ask the general admin to send a new invitation." />
  }

  if (!user) return <SignIn />
  if (!profile || !profile.is_active || profile.role === 'chapter_representative') {
    return (
      <AuthMessage
        message={profileError || 'This account is not authorized to access the NACOS admin portal. Ask the general admin to verify your access.'}
        action="Sign out"
        onAction={() => { void client.auth.signOut() }}
      />
    )
  }

  return children({
    client,
    profile,
    user,
    signOut: async () => {
      const { error } = await client.auth.signOut()
      if (error) throw error
    },
  })
}

function isAdminProfile(value: unknown): value is AdminProfile {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Record<string, unknown>
  return typeof candidate.id === 'string'
    && typeof candidate.full_name === 'string'
    && (candidate.role === 'general_admin' || candidate.role === 'subadmin' || candidate.role === 'chapter_representative')
    && Array.isArray(candidate.permissions)
    && candidate.permissions.every((permission) => typeof permission === 'string')
    && typeof candidate.is_active === 'boolean'
}

function AuthMessage({ message, action, onAction }: { message?: string; action?: string; onAction?: () => void }) {
  return (
    <main className="auth-shell">
      <section className="auth-card">
        <Brand />
        <h1>{message ? 'Admin access' : 'Admin portal setup required'}</h1>
        <p>{message ?? 'Add the Supabase project URL and publishable/anon key to admin/.env.local, then restart the admin app. No preview dashboard is shown without authentication.'}</p>
        {action && <button className="button primary auth-submit" type="button" onClick={onAction}>{action}</button>}
      </section>
    </main>
  )
}

function SignIn() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [messageError, setMessageError] = useState(false)
  const [mode, setMode] = useState<'sign-in' | 'reset'>('sign-in')
  const [busy, setBusy] = useState(false)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const client = supabase
    if (!client) return
    setBusy(true)
    setMessage('')
    setMessageError(false)
    try {
      const result = mode === 'sign-in'
        ? await client.auth.signInWithPassword({ email: email.trim(), password })
        : await client.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/admin/set-password` })
      setMessageError(Boolean(result.error))
      setMessage(result.error ? result.error.message : mode === 'reset' ? 'If an account exists for that email, a password reset link has been sent.' : '')
    } catch (error) {
      setMessageError(true)
      setMessage(error instanceof Error ? error.message : 'Unable to contact Supabase. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <Brand />
        <span className="auth-eyebrow">SECURE ADMIN ACCESS</span>
        <h1>{mode === 'sign-in' ? 'Sign in to your workspace' : 'Reset your password'}</h1>
        <p>{mode === 'sign-in' ? 'Use the email and password for your NACOS admin account.' : 'We’ll email a secure password reset link if the account exists.'}</p>
        <form className="auth-form" onSubmit={submit}>
          <label>Email address<input autoComplete="username" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
          {mode === 'sign-in' && <PasswordField
            label="Password"
            autoComplete="current-password"
            value={password}
            onChange={setPassword}
          />}
          {message && <p className={`auth-feedback${messageError ? '' : ' success'}`} role={messageError ? 'alert' : 'status'}>{message}</p>}
          <button className="button primary auth-submit" type="submit" disabled={busy}>{busy ? 'Please wait…' : mode === 'sign-in' ? 'Sign in' : 'Send reset link'}</button>
        </form>
        <button className="auth-link" type="button" onClick={() => { setMode(mode === 'sign-in' ? 'reset' : 'sign-in'); setMessage(''); setMessageError(false) }}>
          {mode === 'sign-in' ? 'Forgot password?' : 'Back to sign in'}
        </button>
        <small className="auth-footnote">Admin accounts are created by the NACOS general admin. Public sign-up is disabled.</small>
      </section>
    </main>
  )
}

function SetPassword({ onComplete }: { onComplete: () => void }) {
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const client = supabase
    if (!client) return
    if (password.length < 12) {
      setMessage('Use at least 12 characters for your password.')
      return
    }
    if (password !== confirmation) {
      setMessage('The passwords do not match.')
      return
    }
    setBusy(true)
    setMessage('')
    try {
      const { error } = await client.auth.updateUser({ password })
      if (error) setMessage(error.message)
      else onComplete()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to update your password. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <Brand />
        <span className="auth-eyebrow">ACCOUNT INVITATION</span>
        <h1>Set your password</h1>
        <p>Choose a private password for your individual NACOS subadmin account.</p>
        <form className="auth-form" onSubmit={submit}>
          <PasswordField
            label="New password"
            autoComplete="new-password"
            minLength={12}
            value={password}
            onChange={setPassword}
          />
          <PasswordField
            label="Confirm password"
            autoComplete="new-password"
            minLength={12}
            value={confirmation}
            onChange={setConfirmation}
          />
          {message && <p className="auth-feedback" role="alert">{message}</p>}
          <button className="button primary auth-submit" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Set password and continue'}</button>
        </form>
      </section>
    </main>
  )
}

function PasswordField({ label, autoComplete, minLength, value, onChange }: {
  label: string
  autoComplete: string
  minLength?: number
  value: string
  onChange: (value: string) => void
}) {
  const [visible, setVisible] = useState(false)
  const inputId = `password-${label.toLowerCase().replace(/\s+/g, '-')}`

  return (
    <label className="password-field" htmlFor={inputId}>
      <span>{label}</span>
      <span className="password-input-wrap">
        <input
          id={inputId}
          autoComplete={autoComplete}
          minLength={minLength}
          type={visible ? 'text' : 'password'}
          required
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
        <button
          className="password-visibility"
          type="button"
          aria-label={`${visible ? 'Hide' : 'Show'} ${label.toLowerCase()}`}
          aria-pressed={visible}
          onClick={() => setVisible((current) => !current)}
        >
          {visible ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </span>
    </label>
  )
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function EyeOffIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="m3 3 18 18M10.6 10.6a2 2 0 0 0 2.8 2.8" />
      <path d="M9.9 5.2A10.8 10.8 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.1 3.9M6.2 6.2C3.5 8 2 12 2 12s3.6 7 10 7a10 10 0 0 0 4-.8" />
    </svg>
  )
}

function Brand() {
  return (
    <div className="auth-brand">
      <span className="brand-mark">N</span>
      <span><strong>NACOS</strong><small>SOUTH EAST · ADMIN</small></span>
    </div>
  )
}
