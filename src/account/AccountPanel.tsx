/*
  AccountPanel.tsx — sign in, create an account, reset a password, or manage sync.
  Shown on the Progress page. Signing in is always optional.
*/
import { useState, type FormEvent } from 'react'
import {
  createAccount,
  deleteSyncedProgress,
  sendMagicLink,
  sendPasswordReset,
  setNewPassword,
  signInWithPassword,
  signOut,
  useAccount,
} from './account'
import { accountsEnabled } from './supabase'
import './AccountPanel.css'

type Tab = 'link' | 'password' | 'create' | 'forgot'

export default function AccountPanel() {
  const account = useAccount()

  if (!accountsEnabled) {
    return (
      <div className="account-box">
        <p className="account-muted">
          Accounts aren’t switched on yet. Your progress is saved on this device. (For the site owner: see
          SUPABASE_SETUP.md.)
        </p>
      </div>
    )
  }
  if (account.loading) return <div className="account-box account-muted">Checking sign-in…</div>
  if (account.recovering) return <NewPasswordForm />
  if (account.user) return <SignedIn email={account.user.email ?? 'your account'} />
  return <SignInForm />
}

/* ---------- signed in ---------- */

function SignedIn({ email }: { email: string }) {
  const { status, lastSynced } = useAccount()
  const [message, setMessage] = useState<string | null>(null)
  const [armed, setArmed] = useState(false)
  const statusText = {
    off: 'Not syncing',
    syncing: 'Syncing…',
    synced: lastSynced ? `Synced at ${new Date(lastSynced).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : 'Synced',
    error: 'Couldn’t sync. Your progress is still saved on this device.',
  }[status]
  return (
    <div className="account-box">
      <p>
        Signed in as <strong>{email}</strong>
      </p>
      <p className={`account-status is-${status}`} role="status">
        <span className="account-dot" aria-hidden="true" />
        {statusText}
      </p>
      <div className="account-actions">
        <button className="btn" onClick={() => void signOut()}>
          Sign out
        </button>
        <button
          className={`btn ${armed ? 'is-danger' : ''}`}
          onBlur={() => setArmed(false)}
          onClick={async () => {
            if (!armed) return setArmed(true)
            const err = await deleteSyncedProgress()
            setArmed(false)
            setMessage(err ?? 'Your synced progress was deleted. This device still has its own copy.')
          }}
        >
          {armed ? 'Click again to delete' : 'Delete synced progress'}
        </button>
      </div>
      {message && <p className="account-muted">{message}</p>}
      <p className="account-muted">Signing out keeps your progress on this device; it just stops syncing.</p>
    </div>
  )
}

/* ---------- signed out: the sign-in form ---------- */

function SignInForm() {
  const [tab, setTab] = useState<Tab>('link')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState<string | null>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setSent(null)
    let err: string | null = null
    if (tab === 'link') {
      err = await sendMagicLink(email)
      if (!err) setSent(`Check ${email} for a sign-in link. You can close this tab after clicking it.`)
    } else if (tab === 'password') {
      err = await signInWithPassword(email, password)
    } else if (tab === 'create') {
      err = await createAccount(email, password)
      if (!err) setSent(`Account created. If asked, confirm it from the email sent to ${email}, then sign in.`)
    } else {
      err = await sendPasswordReset(email)
      if (!err) setSent(`If an account exists for ${email}, a reset link is on its way.`)
    }
    setError(err)
    setBusy(false)
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'link', label: 'Email link' },
    { id: 'password', label: 'Password' },
    { id: 'create', label: 'Create account' },
  ]

  return (
    <div className="account-box">
      <p>
        Optional: sign in to keep your progress in sync across devices. Everything on the site works without an
        account.
      </p>
      <div className="account-tabs" role="tablist" aria-label="Ways to sign in">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            className={`account-tab ${tab === t.id ? 'is-active' : ''}`}
            onClick={() => {
              setTab(t.id)
              setError(null)
              setSent(null)
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <form className="account-form" onSubmit={submit}>
        <label>
          <span>Email</span>
          <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        {(tab === 'password' || tab === 'create') && (
          <label>
            <span>Password {tab === 'create' && <em>(at least 8 characters)</em>}</span>
            <input
              type="password"
              required
              minLength={tab === 'create' ? 8 : undefined}
              autoComplete={tab === 'create' ? 'new-password' : 'current-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
        )}
        <button className="btn btn-primary" type="submit" disabled={busy}>
          {busy ? 'Working…' : { link: 'Email me a sign-in link', password: 'Sign in', create: 'Create account', forgot: 'Send reset link' }[tab]}
        </button>
        {tab === 'password' && (
          <button type="button" className="account-link" onClick={() => setTab('forgot')}>
            Forgot your password?
          </button>
        )}
        {tab === 'forgot' && <p className="account-muted">Enter your email and we’ll send a link to choose a new password.</p>}
      </form>

      <div role="status" aria-live="polite">
        {error && <p className="account-error">{error}</p>}
        {sent && <p className="account-ok">{sent}</p>}
      </div>
      <p className="account-muted">
        We store only your email and your progress on this site. Nothing is shared or sold.
      </p>
    </div>
  )
}

/* ---------- after clicking a password-reset link ---------- */

function NewPasswordForm() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  return (
    <form
      className="account-box account-form"
      onSubmit={async (e) => {
        e.preventDefault()
        setBusy(true)
        setError(await setNewPassword(password))
        setBusy(false)
      }}
    >
      <p>Choose a new password.</p>
      <label>
        <span>New password (at least 8 characters)</span>
        <input type="password" required minLength={8} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </label>
      <button className="btn btn-primary" type="submit" disabled={busy}>
        {busy ? 'Saving…' : 'Save new password'}
      </button>
      {error && <p className="account-error">{error}</p>}
    </form>
  )
}
