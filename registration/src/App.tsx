import { useEffect, useState } from 'react'
import { RegisterPage } from './RegisterPage'
import { supabase } from './supabase'
import './App.css'

function InvitationGate() {
  const client = supabase
  const isInvitePath = window.location.pathname.startsWith('/invite/')
  const invitationToken = isInvitePath ? window.location.pathname.slice('/invite/'.length) : ''
  const [invitation, setInvitation] = useState<{ email: string; chapterName: string | null } | null>(null)
  const [checking, setChecking] = useState(Boolean(invitationToken && client))
  const [error, setError] = useState('')

  useEffect(() => {
    if (!invitationToken) return
    if (!client) return

    let active = true
    const validate = async () => {
      try {
        const { data, error: validationError } = await client.rpc('validate_chapter_invitation', {
          invitation_token: invitationToken,
        })
        if (validationError) throw validationError
        const result = Array.isArray(data) ? data[0] : data
        if (!result || typeof result.invited_email !== 'string') {
          throw new Error('This invitation link is invalid, expired, revoked, or already used.')
        }
        if (active) setInvitation({ email: result.invited_email, chapterName: result.chapter_name })
      } catch (validationError) {
        if (active) setError(validationError instanceof Error ? validationError.message : 'Could not validate this invitation link.')
      } finally {
        if (active) setChecking(false)
      }
    }
    void validate()
    return () => { active = false }
  }, [client, invitationToken])

  if (invitation) {
    return <RegisterPage
      invitationToken={invitationToken}
      invitedEmail={invitation.email}
      chapterName={invitation.chapterName}
    />
  }

  return (
    <div className="portal-shell">
      <header className="portal-header">
        <a className="brand" href="/" aria-label="NACOS South East registration portal">
          <span className="brand-seal" aria-hidden="true">NACOS</span>
          <span className="brand-copy">
            <strong>NACOS</strong>
            <span>SOUTH EAST</span>
            <small>Chapter registration portal</small>
          </span>
        </a>
      </header>

      <main className="gate-main">
        <section className="gate-card">
          <span className="gate-icon" aria-hidden="true">↗</span>
          <span className="eyebrow">Chapter registration</span>
          <h1>{invitationToken ? checking ? 'Checking your invitation' : 'Invitation required' : 'Access by invitation only'}</h1>
          <p>
            NACOS South East sends a private invitation to a verified chapter representative.
            {invitationToken ? ' Your link must be valid, unexpired, and unused before the registration form opens.' : ' The invitation link is checked before registration access is granted.'}
          </p>
          {invitationToken && !checking && (error || !client) && (
            <div className="gate-notice" role="alert">
              <strong>{error ? 'This invitation could not be verified.' : 'Registration is temporarily unavailable.'}</strong>
              <span>Ask the NACOS South East administrator to verify your access or issue a new link.</span>
            </div>
          )}
          <div className="gate-help">
            If you are a chapter representative and need access, contact the NACOS South East
            zonal team at <a href="mailto:hello@nacosoutheast.org.ng">hello@nacosoutheast.org.ng</a>.
          </div>
          {import.meta.env.DEV && !invitationToken && (
            <a className="button preview-button" href="/preview">
              Open design preview (no real submission)
            </a>
          )}
        </section>
      </main>

      <footer className="portal-footer">
        <span>© 2026 NACOS South East</span>
        <a href="https://www.nacosoutheast.org.ng/">Main NACOS website</a>
      </footer>
    </div>
  )
}

function App() {
  const isDesignPreview = import.meta.env.DEV && window.location.pathname === '/preview'
  return isDesignPreview ? <RegisterPage /> : <InvitationGate />
}

export default App
