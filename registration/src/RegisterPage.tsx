import { useRef, useState } from 'react'
import type { FormEvent, ChangeEvent } from 'react'
import { Icon } from './components/Icon'
import { supabase } from './supabase'

const states = ['Abia', 'Anambra', 'Ebonyi', 'Enugu', 'Imo']

type RegistrationData = {
  institution: string
  state: string
  address: string
  institutionType: string
  chapterName: string
  established: string
  president: string
  secretary: string
  phone: string
  email: string
  members: string
  description: string
  social: string
}

const initialData: RegistrationData = {
  institution: '',
  state: '',
  address: '',
  institutionType: '',
  chapterName: '',
  established: '',
  president: '',
  secretary: '',
  phone: '',
  email: '',
  members: '',
  description: '',
  social: '',
}

const stepLabels = ['Institution', 'Leadership', 'Chapter info', 'Review']
const currentYear = new Date().getFullYear()

export function RegisterPage({ invitationToken, invitedEmail, chapterName }: {
  invitationToken?: string
  invitedEmail?: string
  chapterName?: string | null
}) {
  const [step, setStep] = useState(0)
  const [data, setData] = useState<RegistrationData>({ ...initialData, email: invitedEmail ?? '' })
  const [logoName, setLogoName] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const formRef = useRef<HTMLFormElement>(null)

  const update = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = event.target
    setData((previous) => ({ ...previous, [name]: value }))
  }

  const goNext = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (formRef.current?.reportValidity()) setStep((current) => Math.min(current + 1, 3))
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!invitationToken) {
      setSubmitted(true)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    if (!supabase) {
      setSubmitError('Registration is temporarily unavailable. Contact the NACOS South East administrator.')
      return
    }
    setSubmitting(true)
    setSubmitError('')
    try {
      const { error } = await supabase.rpc('submit_chapter_application', {
        invitation_token: invitationToken,
        application: {
          chapter_name: data.chapterName,
          institution_name: data.institution,
          state: data.state,
          institution_address: data.address,
          institution_type: data.institutionType,
          established_year: data.established,
          president_name: data.president,
          secretary_name: data.secretary,
          contact_phone: data.phone,
          contact_email: data.email,
          active_members: data.members,
          description: data.description,
          social_url: data.social || null,
        },
      })
      if (error) throw error
      setSubmitted(true)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Could not submit your application. Check your invitation and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const startOver = () => {
    setData(initialData)
    setLogoName('')
    setStep(0)
    setSubmitted(false)
  }

  const field = (
    name: keyof RegistrationData,
    label: string,
    required = true,
    type = 'text',
    placeholder = '',
  ) => (
    <div className="field">
      <label htmlFor={name}>{label}{required && <> <span>*</span></>}</label>
      <input
        className="control"
        id={name}
        name={name}
        type={type}
        placeholder={placeholder}
        value={data[name]}
        required={required}
        readOnly={name === 'email' && Boolean(invitationToken)}
        onChange={update}
        min={name === 'established' ? 1900 : undefined}
        max={name === 'established' ? currentYear : undefined}
      />
    </div>
  )

  const selectState = (
    <div className="field">
      <label htmlFor="state">State <span>*</span></label>
      <select className="control" id="state" name="state" value={data.state} required onChange={update}>
        <option value="">Select a state</option>
        {states.map((state) => <option key={state} value={state}>{state} State</option>)}
      </select>
    </div>
  )

  return (
    <>
      <section className="page-banner">
        <div className="page-banner-inner">
          <span className="eyebrow">Invitation-only portal</span>
          <h1>Register your chapter</h1>
          <p>Provide chapter information for NACOS South East verification and review.</p>
        </div>
      </section>
      <section className="section">
        <div className="content-width form-layout">
          <div className="form-card">
            {submitted ? (
              <div className="success-panel" role="status">
                <span className="success-icon"><Icon name="check" /></span>
                      <h2>{invitationToken ? 'Application submitted' : 'Registration preview complete'}</h2>
                      <p>{invitationToken
                        ? `Your application for ${data.chapterName || 'your chapter'} was securely submitted to NACOS South East for review.`
                        : `This preview did not submit or save information about ${data.chapterName || 'your chapter'}.`}</p>
                      {!invitationToken && <button className="button" type="button" onClick={startOver}>Preview another registration</button>}
                    </div>
                  ) : (
                    <form ref={formRef} onSubmit={step < 3 ? goNext : submit}>
                      {invitationToken && <div className="aside-note"><strong>Verified invitation</strong>{chapterName ? ` · ${chapterName}` : ''} · {invitedEmail}</div>}
                      {submitError && <div className="gate-notice" role="alert"><strong>Application not submitted</strong><span>{submitError}</span></div>}
                <div className="steps" aria-label="Registration progress">
                  {stepLabels.map((label, index) => (
                    <div className={`step${index === step ? ' active' : ''}${index < step ? ' complete' : ''}`} key={label}>
                      <span className="step-number">{index < step ? <Icon name="check" /> : index + 1}</span>
                      <span>{label}</span>
                    </div>
                  ))}
                </div>

                {step === 0 && (
                  <>
                    <h2 className="form-section-title">Institution information</h2>
                    <p className="form-section-hint">Start with your institution and chapter details.</p>
                    <div className="form-grid">
                      {field('institution', 'Institution name', true, 'text', 'e.g. University of Nigeria, Nsukka')}
                      {selectState}
                      {field('address', 'Institution address', true, 'text', 'Campus or institution address')}
                      <div className="field">
                        <label htmlFor="institutionType">Institution type <span>*</span></label>
                        <select className="control" id="institutionType" name="institutionType" value={data.institutionType} required onChange={update}>
                          <option value="">Select institution type</option>
                          <option>Federal university</option><option>State university</option>
                          <option>Private university</option><option>Polytechnic</option><option>College of education</option>
                        </select>
                      </div>
                      {field('chapterName', 'Chapter name', true, 'text', 'e.g. NACOS UNN')}
                      {field('established', 'Year established', true, 'number', 'e.g. 2012')}
                    </div>
                  </>
                )}

                {step === 1 && (
                  <>
                    <h2 className="form-section-title">Chapter leadership</h2>
                    <p className="form-section-hint">Provide the current chapter officers and a contact for follow-up.</p>
                    <div className="form-grid">
                      {field('president', 'Chapter President', true, 'text', 'Full name')}
                      {field('secretary', 'Chapter Secretary', true, 'text', 'Full name')}
                      {field('phone', 'Contact phone', true, 'tel', '+234 800 000 0000')}
                      {field('email', 'Email address', true, 'email', 'chapter@example.edu.ng')}
                    </div>
                  </>
                )}

                {step === 2 && (
                  <>
                    <h2 className="form-section-title">Chapter information</h2>
                    <p className="form-section-hint">Help students and NACOS members learn more about your chapter.</p>
                    <div className="form-grid">
                      {field('members', 'Number of active members', true, 'number', 'e.g. 120')}
                      {field('social', 'Social media link(s)', false, 'url', 'https://')}
                      <div className="field full-width">
                        <label htmlFor="description">Chapter description <span>*</span></label>
                        <textarea
                          className="control"
                          id="description"
                          name="description"
                          placeholder="Share a short description of your chapter, its activities and community."
                          value={data.description}
                          required
                          minLength={20}
                          maxLength={500}
                          onChange={update}
                        />
                        <span className="field-help">20–500 characters.</span>
                      </div>
                      <div className="field full-width">
                        <span className="field-label">Chapter logo (optional)</span>
                        <label className="upload-box" htmlFor="logo">
                          <Icon name="upload" />
                          <span><strong>{logoName || 'Choose a logo image'}</strong>{logoName ? 'Selected for this preview only' : 'PNG or JPG. File will not be uploaded in this preview.'}</span>
                          <input
                            id="logo"
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            onChange={(event) => setLogoName(event.target.files?.[0]?.name ?? '')}
                          />
                        </label>
                      </div>
                    </div>
                  </>
                )}

                {step === 3 && (
                  <>
                    <h2 className="form-section-title">Review your information</h2>
                    <p className="form-section-hint">Please check the details before submitting your chapter registration.</p>
                    <div className="summary-grid">
                      {([
                        ['Institution', data.institution],
                        ['State', data.state ? `${data.state} State` : '—'],
                        ['Address', data.address],
                        ['Institution type', data.institutionType],
                        ['Chapter name', data.chapterName],
                        ['Year established', data.established],
                        ['Chapter President', data.president],
                        ['Chapter Secretary', data.secretary],
                        ['Contact phone', data.phone],
                        ['Email address', data.email],
                        ['Active members', data.members],
                        ['Social media', data.social],
                        ['Chapter logo', logoName],
                        ['Description', data.description],
                      ] as const).map(([label, value]) => (
                        <div className="summary-item" key={label}>
                          <span>{label}</span>
                          <strong>{value || '—'}</strong>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                <div className="form-actions">
                  {step > 0 ? (
                    <button className="button button-outline" type="button" onClick={() => setStep((current) => current - 1)}>
                      <Icon name="back" /> Back
                    </button>
                  ) : <span />}
                  <button className="button" type="submit" disabled={submitting}>
                    {submitting ? 'Submitting…' : step === 3 ? 'Submit registration' : 'Continue'} {step < 3 && <Icon name="arrow" />}
                  </button>
                </div>
              </form>
            )}
          </div>

          <aside className="form-aside">
            <h3 className="aside-title">Chapter registration</h3>
            <p className="aside-copy">
              Submit your chapter details for inclusion in the NACOS South East directory.
              You can review all information before the final step.
            </p>
            <div className="aside-note">
              {invitationToken
                ? 'Your submission is saved securely in Supabase for NACOS administrator review. Chapter information will not become public until it is approved.'
                : 'Design preview only. This form does not store or transmit your personal information or upload selected files.'}
            </div>
            <p className="aside-copy contact-copy">
              Need help? Contact the zonal team at hello@nacosoutheast.org.ng.
            </p>
          </aside>
        </div>
      </section>
    </>
  )
}
