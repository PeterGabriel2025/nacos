import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import './App.css'
import { AuthGate } from './AuthGate'
import type { AuthenticatedAdmin } from './AuthGate'

type Section = 'Overview' | 'Applications' | 'Chapters' | 'Leadership' | 'Media archive' | 'Invitations' | 'Team & access'
type Status = 'Pending review' | 'Approved' | 'Needs information' | 'Rejected'
type Chapter = {
  id: string
  name: string
  institution: string
  state: string
  president: string
  members: number
  status: Status
  submitted: string
  institutionAddress: string
  institutionType: string
  establishedYear: number
  description: string
  socialUrl: string
}
type Executive = {
  id: string
  name: string
  position: string
  institution: string
  term: string
  termId: string
  state: string
}
type Media = {
  id: string
  title: string
  category: string
  year: number
  file_path: string | null
  storage_bucket: string | null
  mime_type: string | null
  is_published: boolean
}
type FormItem = { label: string; key: string; type?: string; options?: string[]; required?: boolean; accept?: string }
type Subadmin = {
  id: string
  full_name: string
  email: string | null
  permissions: string[]
  is_active: boolean
  invited: boolean
}

const permissionOptions = [
  { value: 'applications.review', label: 'Review chapter applications' },
  { value: 'chapters.manage', label: 'Edit approved chapter details' },
  { value: 'leadership.manage', label: 'Manage leadership records' },
  { value: 'media.manage', label: 'Manage media archive' },
  { value: 'invitations.manage', label: 'Manage chapter invitations' },
  { value: 'audit.read', label: 'Read audit history' },
]
const registrationPortalUrl = import.meta.env.VITE_REGISTRATION_PORTAL_URL
  || (import.meta.env.DEV ? 'http://127.0.0.1:5174/' : 'https://register.nacosoutheast.org.ng/')
const publicSiteUrl = import.meta.env.VITE_PUBLIC_SITE_URL
  || (import.meta.env.DEV ? 'http://127.0.0.1:5173/' : 'https://www.nacosoutheast.org.ng/')
const mediaBucket = 'nacos-south-east'
const documentsBucket = 'nacos-docs'
const acceptedImageTypes: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

function displayStatus(value: string): Status {
  if (value === 'approved') return 'Approved'
  if (value === 'needs_information') return 'Needs information'
  if (value === 'rejected') return 'Rejected'
  return 'Pending review'
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

type LeadershipTerm = { id: string; title: string; start_year: number; end_year: number }

type InvitationResult = { invitation_id: string; invite_token: string; expires_at: string }

const navItems: { label: Section; icon: string }[] = [
  { label: 'Overview', icon: '◫' },
  { label: 'Applications', icon: '▤' },
  { label: 'Chapters', icon: '⌂' },
  { label: 'Leadership', icon: '♙' },
  { label: 'Media archive', icon: '▧' },
  { label: 'Invitations', icon: '✉' },
  { label: 'Team & access', icon: '♧' },
]

const sections: Record<Section, { title: string; subtitle: string }> = {
  Overview: { title: 'Overview', subtitle: 'A snapshot of NACOS South East records and activity.' },
  Applications: { title: 'Chapter applications', subtitle: 'Review submitted chapter information before it appears publicly.' },
  Chapters: { title: 'Chapters', subtitle: 'Manage chapter profiles shown in the public directory.' },
  Leadership: { title: 'Zonal leadership', subtitle: 'Maintain executive profiles and leadership terms.' },
  'Media archive': { title: 'Media archive', subtitle: 'Organize the photos and historical records shared with the public.' },
  Invitations: { title: 'Chapter invitations', subtitle: 'Prepare access for verified chapter representatives.' },
  'Team & access': { title: 'Team & access', subtitle: 'Manage general admin and subadmin access.' },
}

function StatusPill({ status }: { status: Status }) {
  const className = status === 'Approved' ? 'approved' : status === 'Pending review' ? 'pending' : status === 'Rejected' ? 'rejected' : 'needs-info'
  return <span className={`status-pill ${className}`}>{status}</span>
}

function App() {
  return <AuthGate>{(admin) => <AdminWorkspace {...admin} />}</AuthGate>
}

function AdminWorkspace({ client, profile, user, signOut }: AuthenticatedAdmin) {
  const [active, setActive] = useState<Section>('Overview')
  const [mobileNav, setMobileNav] = useState(false)
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [applications, setApplications] = useState<Chapter[]>([])
  const [executives, setExecutives] = useState<Executive[]>([])
  const [media, setMedia] = useState<Media[]>([])
  const [terms, setTerms] = useState<LeadershipTerm[]>([])
  const [recordsLoading, setRecordsLoading] = useState(true)
  const [recordsError, setRecordsError] = useState('')
  const [team, setTeam] = useState<Subadmin[]>([])
  const [teamLoading, setTeamLoading] = useState(false)
  const [teamError, setTeamError] = useState('')
  const [query, setQuery] = useState('')
  const [applicationFilter, setApplicationFilter] = useState<'All submissions' | Status>('All submissions')
  const [modal, setModal] = useState<{ title: string; items: FormItem[]; initial?: Record<string, string>; onSave: (values: Record<string, string>, file?: File) => void | Promise<void> } | null>(null)
  const [toast, setToast] = useState('')

  const notify = (message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(''), 3500)
  }

  const hasPermission = useCallback((permission: string) => profile.role === 'general_admin' || profile.permissions.includes(permission), [profile])
  const canManageTeam = profile.role === 'general_admin'

  const loadRecords = useCallback(async () => {
    try {
      const chapterQuery = client.from('chapters')
        .select('id, name, institution_name, state, president_name, active_members, status, created_at, institution_address, institution_type, established_year, description, social_url')
        .order('state')
        .order('name')
      const queries = await Promise.all([
        chapterQuery,
        hasPermission('applications.review')
          ? client.from('chapter_applications').select('*').order('created_at', { ascending: false })
          : Promise.resolve({ data: [], error: null }),
        hasPermission('leadership.manage')
          ? client.from('leadership_terms').select('id, title, start_year, end_year').order('start_year', { ascending: false })
          : Promise.resolve({ data: [], error: null }),
        hasPermission('leadership.manage')
          ? client.from('executives').select('id, full_name, position, institution, state, term_id, leadership_terms(title, start_year, end_year)').order('display_order')
          : Promise.resolve({ data: [], error: null }),
        hasPermission('media.manage')
          ? client.from('media_items').select('id, title, category, year, file_path, storage_bucket, mime_type, is_published').order('year', { ascending: false })
          : Promise.resolve({ data: [], error: null }),
      ])
      const failed = queries.find((result) => result.error)
      if (failed?.error) throw new Error(failed.error.message)

      const [chapterResult, applicationResult, termResult, executiveResult, mediaResult] = queries
      setChapters((chapterResult.data ?? []).map((row) => ({
        id: row.id,
        name: row.name,
        institution: row.institution_name,
        state: row.state,
        president: row.president_name,
        members: row.active_members,
        status: displayStatus(row.status),
        submitted: formatDate(row.created_at),
        institutionAddress: row.institution_address,
        institutionType: row.institution_type,
        establishedYear: row.established_year,
        description: row.description,
        socialUrl: row.social_url ?? '',
      })))
      setApplications((applicationResult.data ?? []).map((row) => ({
        id: row.id,
        name: row.chapter_name,
        institution: row.institution_name,
        state: row.state,
        president: row.president_name,
        members: row.active_members,
        status: displayStatus(row.status),
        submitted: formatDate(row.created_at),
        institutionAddress: row.institution_address,
        institutionType: row.institution_type,
        establishedYear: row.established_year,
        description: row.description,
        socialUrl: row.social_url ?? '',
      })))
      setTerms(termResult.data ?? [])
      setExecutives((executiveResult.data ?? []).map((row) => {
        const term = row.leadership_terms as unknown as { title: string; start_year: number; end_year: number }
        return {
          id: row.id,
          name: row.full_name,
          position: row.position,
          institution: row.institution,
          term: term?.title ?? `${term?.start_year ?? ''} — ${term?.end_year ?? ''}`,
          termId: row.term_id,
          state: row.state,
        }
      }))
      setMedia((mediaResult.data ?? []) as Media[])
      setRecordsError('')
    } catch (error) {
      setRecordsError(error instanceof Error ? error.message : 'Could not load Supabase records.')
      setChapters([])
      setApplications([])
      setExecutives([])
      setMedia([])
      setTerms([])
    } finally {
      setRecordsLoading(false)
    }
  }, [client, hasPermission])

  useEffect(() => {
    void Promise.resolve().then(loadRecords)
  }, [loadRecords])

  const loadTeam = useCallback(async () => {
    setTeamLoading(true)
    setTeamError('')
    try {
      const { data, error } = await client.functions.invoke('list-subadmins')
      if (error) {
        setTeamError(error.message)
      } else {
        const result = data as { members?: Subadmin[]; error?: string } | null
        if (result?.error) setTeamError(result.error)
        else if (!Array.isArray(result?.members)) setTeamError('The team service returned an invalid response.')
        else setTeam(result.members)
      }
    } catch (error) {
      setTeamError(error instanceof Error ? error.message : 'Unable to load the admin team.')
    } finally {
      setTeamLoading(false)
    }
  }, [client])

  const inviteSubadmin = async (name: string, email: string, permissions: string[]) => {
    const { data, error } = await client.functions.invoke('create-subadmin', {
      body: { name, email, permissions },
    })
    if (error) throw new Error(error.message)
    const result = data as { error?: string; id?: string; email?: string } | null
    if (result?.error) throw new Error(result.error)
    if (!result?.id || result.email?.toLowerCase() !== email.trim().toLowerCase()) {
      throw new Error('The invitation service did not confirm the invited account. Check the team list before retrying.')
    }
    notify(`Invitation sent to ${email}. They will set their own password from the email link.`)
    await loadTeam()
  }

  const manageSubadmin = async (id: string, permissions: string[], isActive: boolean) => {
    const { data, error } = await client.functions.invoke('manage-subadmin', {
      body: { id, permissions, is_active: isActive },
    })
    if (error) throw new Error(error.message)
    const result = data as { error?: string; member?: Subadmin } | null
    if (result?.error) throw new Error(result.error)
    if (!result?.member || result.member.id !== id) throw new Error('The team service did not confirm the access update.')
    notify('Subadmin access updated.')
    await loadTeam()
  }

  const pendingCount = applications.filter((application) => application.status === 'Pending review').length
  const filteredChapters = useMemo(() => {
    const source = active === 'Applications' ? applications : chapters
    return source.filter((chapter) => {
    const term = query.trim().toLowerCase()
    const matchesQuery = !term || [chapter.name, chapter.institution, chapter.state, chapter.president].some((value) => value.toLowerCase().includes(term))
    const matchesStatus = applicationFilter === 'All submissions' || chapter.status === applicationFilter
    return matchesQuery && matchesStatus
    })
  }, [active, applications, chapters, query, applicationFilter])

  const updateStatus = async (id: string, status: Status) => {
    try {
      if (!hasPermission('applications.review')) return
      const { error } = status === 'Approved'
        ? await client.rpc('approve_chapter_application', { application_id: id })
        : await client.rpc('set_application_review_status', {
            application_id: id,
            new_status: status === 'Rejected' ? 'rejected' : status === 'Needs information' ? 'needs_information' : 'under_review',
            notes: null,
          })
      if (error) throw new Error(error.message)
      notify(`Application marked ${status.toLowerCase()}.`)
      await loadRecords()
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Application could not be updated.')
    }
  }

  const openChapterForm = (chapter?: Chapter) => {
    const items: FormItem[] = [
      { label: 'Chapter name', key: 'name' },
      { label: 'Institution', key: 'institution' },
      { label: 'State', key: 'state', options: ['Abia', 'Anambra', 'Ebonyi', 'Enugu', 'Imo'] },
      { label: 'Institution address', key: 'institutionAddress' },
      { label: 'Institution type', key: 'institutionType' },
      { label: 'Year established', key: 'establishedYear', type: 'number' },
      { label: 'Chapter president', key: 'president' },
      { label: 'Active members', key: 'members', type: 'number' },
      { label: 'Social link', key: 'socialUrl', required: false },
      { label: 'Description', key: 'description' },
    ]
    setModal({
      title: chapter ? 'Edit chapter' : 'Add chapter',
      items,
      initial: chapter ? { ...chapter, members: String(chapter.members), establishedYear: String(chapter.establishedYear) } : {},
      onSave: async (values) => {
        if (!chapter) throw new Error('New chapters can only be added through a reviewed application.')
        const { error } = await client.from('chapters').update({
          name: values.name,
          institution_name: values.institution,
          state: values.state,
          institution_address: values.institutionAddress,
          institution_type: values.institutionType,
          established_year: Number(values.establishedYear),
          president_name: values.president,
          active_members: Number(values.members),
          social_url: values.socialUrl || null,
          description: values.description,
        }).eq('id', chapter.id)
        if (error) throw new Error(error.message)
        notify('Chapter saved to Supabase.')
        await loadRecords()
      },
    })
  }

  const openExecutiveForm = (executive?: Executive) => {
    const items: FormItem[] = [
      { label: 'Full name', key: 'name' },
      { label: 'Position', key: 'position' },
      { label: 'Institution', key: 'institution' },
      { label: 'Leadership term', key: 'term', options: terms.map((term) => term.title), required: true },
      { label: 'State', key: 'state', options: ['Abia', 'Anambra', 'Ebonyi', 'Enugu', 'Imo'] },
    ]
    setModal({
      title: executive ? 'Edit executive profile' : 'Add executive profile',
      items,
      initial: executive ? { ...executive } : {},
      onSave: async (values) => {
        const term = terms.find((item) => item.title === values.term)
        if (!term) throw new Error('Select a valid leadership term.')
        const record = {
          full_name: values.name,
          position: values.position,
          institution: values.institution,
          term_id: term.id,
          state: values.state,
        }
        const result = executive
          ? await client.from('executives').update(record).eq('id', executive.id)
          : await client.from('executives').insert(record)
        if (result.error) throw new Error(result.error.message)
        notify('Executive record saved to Supabase.')
        await loadRecords()
      },
    })
  }

  const openMediaForm = (item?: Media) => {
    const items: FormItem[] = [
      { label: 'Media title', key: 'title' },
      { label: 'Category', key: 'category', options: ['Leadership', 'Events', 'Community', 'Documents'] },
      { label: 'Year', key: 'year', type: 'number' },
      { label: item?.file_path ? 'Replace file (optional)' : 'File (optional)', key: 'file', type: 'file', required: false, accept: 'image/jpeg,image/png,image/webp,application/pdf' },
      { label: 'Publish on public site', key: 'isPublished', type: 'checkbox', required: false },
    ]
    setModal({
      title: item ? 'Edit archive item' : 'Add to media archive',
      items,
      initial: item
        ? { title: item.title, category: item.category[0].toUpperCase() + item.category.slice(1), year: String(item.year), isPublished: String(item.is_published) }
        : { isPublished: 'false' },
      onSave: async (values, selectedFile) => {
        const category = values.category.toLowerCase()
        const isDocument = category === 'documents'
        const isPublished = !isDocument && values.isPublished === 'true'
        let uploadedPath: string | null = null
        let bucket = item?.storage_bucket ?? null
        let mimeType = item?.mime_type ?? null
        const oldFile = item?.file_path ? { bucket: item.storage_bucket, path: item.file_path } : null

        if (selectedFile) {
          const extension = isDocument ? (selectedFile.type === 'application/pdf' ? 'pdf' : null) : acceptedImageTypes[selectedFile.type]
          const maxSize = isDocument ? 10 * 1024 * 1024 : 5 * 1024 * 1024
          if (!extension) throw new Error(isDocument ? 'Documents must be PDF files.' : 'Images must be JPEG, PNG, or WebP files.')
          if (selectedFile.size > maxSize) throw new Error(`The selected file exceeds the ${isDocument ? '10 MB' : '5 MB'} limit.`)

          bucket = isDocument ? documentsBucket : mediaBucket
          mimeType = selectedFile.type
          const objectPath = `${user.id}/${crypto.randomUUID()}.${extension}`
          const { data: uploaded, error: uploadError } = await client.storage.from(bucket).upload(objectPath, selectedFile, {
            contentType: selectedFile.type,
            upsert: false,
          })
          if (uploadError) throw new Error(`File upload failed: ${uploadError.message}`)
          uploadedPath = uploaded.path
        }
        if (item?.file_path && !selectedFile && item.storage_bucket !== (isDocument ? documentsBucket : mediaBucket)) {
          throw new Error('Choose a replacement file to move this record between the public-media and private-document buckets.')
        }

        const record = {
          title: values.title.trim(),
          category,
          year: Number(values.year),
          is_published: isPublished,
          ...(uploadedPath ? { file_path: uploadedPath, storage_bucket: bucket, mime_type: mimeType } : {}),
        }
        const result = item
          ? await client.from('media_items').update(record).eq('id', item.id)
          : await client.from('media_items').insert(record)
        if (result.error) {
          if (uploadedPath && bucket) {
            const cleanup = await client.storage.from(bucket).remove([uploadedPath])
            if (cleanup.error) throw new Error(`Could not save media metadata (${result.error.message}); uploaded file cleanup also failed (${cleanup.error.message}). Contact the system administrator.`)
          }
          throw new Error(`Could not save media metadata: ${result.error.message}`)
        }

        if (uploadedPath && oldFile?.bucket && oldFile.path) {
          const cleanup = await client.storage.from(oldFile.bucket).remove([oldFile.path])
          if (cleanup.error) notify(`Media was saved, but the replaced file could not be removed: ${cleanup.error.message}`)
        }

        notify(isDocument
          ? 'Private document and metadata saved. Documents are never published to the public site.'
          : isPublished ? 'Media saved and published.' : 'Media saved as unpublished.')
        await loadRecords()
      },
    })
  }

  const createChapterInvite = async (email: string, phone: string, chapterId: string, expiresInHours: number) => {
    const { data, error } = await client.rpc('create_chapter_invitation', {
      recipient_email: email,
      recipient_phone: phone || null,
      target_chapter_id: chapterId || null,
      expires_in_hours: expiresInHours,
    })
    if (error) throw new Error(error.message)
    const invitation = (Array.isArray(data) ? data[0] : data) as InvitationResult | undefined
    if (!invitation?.invite_token) throw new Error('Supabase did not return the invitation token.')
    return {
      url: `${registrationPortalUrl.replace(/\/$/, '')}/invite/${invitation.invite_token}`,
      expiresAt: invitation.expires_at,
    }
  }

  const deleteMedia = async (id: string) => {
    const item = media.find((record) => record.id === id)
    const { error } = await client.from('media_items').delete().eq('id', id)
    if (error) {
      notify(error.message)
      return
    }
    if (item?.file_path && item.storage_bucket) {
      const { error: storageError } = await client.storage.from(item.storage_bucket).remove([item.file_path])
      if (storageError) {
        notify(`Media record removed, but its file could not be removed: ${storageError.message}`)
        await loadRecords()
        return
      }
    }
    notify('Media record and stored file removed.')
    await loadRecords()
  }

  const pageTitle = sections[active]

  return (
    <div className="admin-app">
      {mobileNav && <button className="nav-backdrop" aria-label="Close navigation" onClick={() => setMobileNav(false)} />}
      <aside className={`sidebar${mobileNav ? ' mobile-open' : ''}`}>
        <a className="admin-brand" href="#" onClick={(event) => { event.preventDefault(); setActive('Overview'); setMobileNav(false) }}>
          <span className="brand-mark">N</span>
          <span><strong>NACOS</strong><small>SOUTH EAST</small></span>
          <span className="admin-label">ADMIN</span>
        </a>
        <div className="sidebar-caption">WORKSPACE</div>
        <nav className="side-nav" aria-label="Admin navigation">
          {navItems.filter((item) => item.label === 'Overview'
            || (item.label === 'Applications' && hasPermission('applications.review'))
            || (item.label === 'Chapters' && hasPermission('chapters.manage'))
            || (item.label === 'Leadership' && hasPermission('leadership.manage'))
            || (item.label === 'Media archive' && hasPermission('media.manage'))
            || (item.label === 'Invitations' && hasPermission('invitations.manage'))
            || (item.label === 'Team & access' && canManageTeam)).map((item) => (
            <button
              type="button"
              key={item.label}
              className={`side-link${active === item.label ? ' selected' : ''}`}
              onClick={() => {
                setActive(item.label)
                setMobileNav(false)
                setQuery('')
                if (item.label === 'Team & access') void loadTeam()
              }}
            >
              <span className="side-icon">{item.icon}</span>
              <span>{item.label}</span>
              {item.label === 'Applications' && pendingCount > 0 && <span className="nav-count">{pendingCount}</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="preview-caption"><span className="preview-dot" /> Signed in · live Supabase records</div>
          <button className="user-card" type="button" onClick={() => { void signOut().catch((error: Error) => notify(error.message)) }}>
            <span className="avatar">{profile.full_name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()}</span>
            <span className="user-copy"><strong>{profile.full_name}</strong><small>{profile.role.replace('_', ' ')} · {user.email}</small></span>
            <span className="user-menu">Sign out</span>
          </button>
        </div>
      </aside>

      <div className="workspace">
        <header className="topbar">
          <button className="mobile-menu-button" type="button" aria-label="Open navigation" onClick={() => setMobileNav(true)}>☰</button>
          <div className="breadcrumbs"><span>Workspace</span><span>/</span><strong>{active}</strong></div>
          <div className="top-actions">
            <span className="preview-chip">Supabase admin session active</span>
            <a className="public-link" href={publicSiteUrl} target="_blank" rel="noreferrer">View public site <span>↗</span></a>
            <span className="avatar top-avatar">AO</span>
          </div>
        </header>

        <main className="main-content">
          <div className="page-heading">
            <div><h1>{pageTitle.title}</h1><p>{pageTitle.subtitle}</p></div>
            <span className="date-label">{profile.role === 'general_admin' ? 'General admin' : 'Subadmin'}</span>
          </div>

          {recordsError && active !== 'Team & access' && <div className="team-error" role="alert"><span>Could not load Supabase records: {recordsError}</span><button className="text-button" onClick={() => { void loadRecords() }}>Retry</button></div>}
          {recordsLoading && active !== 'Team & access' && <div className="media-notice">Loading records from Supabase…</div>}
          {active === 'Overview' && (
            <Overview chapters={chapters} applications={applications} executives={executives} media={media} pendingCount={pendingCount} setActive={setActive} />
          )}
          {(active === 'Applications' || active === 'Chapters') && (
            <ChapterManagement
              mode={active}
              chapters={filteredChapters}
              query={query}
              setQuery={setQuery}
              status={applicationFilter}
              setStatus={setApplicationFilter}
              updateStatus={updateStatus}
              editChapter={openChapterForm}
              canManage={hasPermission(active === 'Applications' ? 'applications.review' : 'chapters.manage')}
            />
          )}
          {active === 'Leadership' && <LeadershipManagement executives={executives} add={() => openExecutiveForm()} edit={openExecutiveForm} canManage={hasPermission('leadership.manage')} />}
          {active === 'Media archive' && <MediaManagement client={client} media={media} add={() => openMediaForm()} edit={openMediaForm} remove={(id) => { void deleteMedia(id) }} canManage={hasPermission('media.manage')} />}
          {active === 'Invitations' && hasPermission('invitations.manage') && <Invitations chapters={chapters} onCreate={createChapterInvite} />}
          {active === 'Team & access' && <TeamAccess
            canManage={canManageTeam}
            members={team}
            loading={teamLoading}
            error={teamError}
            onInvite={inviteSubadmin}
            onManage={manageSubadmin}
            onReload={() => { void loadTeam() }}
          />}
        </main>
        <footer className="workspace-footer"><span>NACOS South East · Admin workspace</span><span>Chapter, leadership, media, and application records load from Supabase.</span></footer>
      </div>

      {toast && <div className="toast" role="status">{toast}</div>}
      {modal && <FormModal config={modal} close={() => setModal(null)} />}
    </div>
  )
}

function Overview({ chapters, applications, executives, media, pendingCount, setActive }: {
  chapters: Chapter[]
  applications: Chapter[]
  executives: Executive[]
  media: Media[]
  pendingCount: number
  setActive: (section: Section) => void
}) {
  const metrics = [
    { label: 'Recognized chapters', value: chapters.filter((item) => item.status === 'Approved').length, note: 'Published records', icon: '⌂', tone: 'green' },
    { label: 'Awaiting review', value: pendingCount, note: 'Pending applications', icon: '▤', tone: 'amber' },
    { label: 'Executive profiles', value: executives.length, note: 'Supabase records', icon: '♙', tone: 'blue' },
    { label: 'Archive items', value: media.length, note: 'Media metadata', icon: '▧', tone: 'violet' },
  ]
  return (
    <>
      <div className="metrics-grid">
        {metrics.map((metric) => (
          <article className="metric-card" key={metric.label}>
            <div className={`metric-icon ${metric.tone}`}>{metric.icon}</div>
            <span className="metric-label">{metric.label}</span>
            <strong className="metric-value">{metric.value}</strong>
            <span className="metric-note">{metric.note}</span>
          </article>
        ))}
      </div>
      <section className="attention-banner">
        <div className="attention-symbol">!</div>
        <div><strong>{pendingCount} chapter applications need your review</strong><span>Check submissions before they become visible on the public site.</span></div>
        <button className="button button-light small" type="button" onClick={() => setActive('Applications')}>Review applications <span>→</span></button>
      </section>
      <div className="overview-grid">
        <section className="panel">
          <div className="panel-heading"><div><h2>Recent applications</h2><p>Latest submissions from chapter representatives</p></div><button className="text-button" onClick={() => setActive('Applications')}>View all <span>→</span></button></div>
          <ChapterTable chapters={applications.slice(0, 4)} compact onReview={() => setActive('Applications')} canManage={false} />
        </section>
        <section className="panel quick-panel">
          <div className="panel-heading"><div><h2>Quick actions</h2><p>Common workspace tasks</p></div></div>
          <button className="quick-action" onClick={() => setActive('Applications')}><span className="quick-icon amber">▤</span><span><strong>Review applications</strong><small>{pendingCount} awaiting review</small></span><span className="quick-arrow">→</span></button>
          <button className="quick-action" onClick={() => setActive('Invitations')}><span className="quick-icon green">✉</span><span><strong>Prepare an invitation</strong><small>For a verified chapter contact</small></span><span className="quick-arrow">→</span></button>
          <button className="quick-action" onClick={() => setActive('Media archive')}><span className="quick-icon violet">▧</span><span><strong>Update the archive</strong><small>Photos and historical records</small></span><span className="quick-arrow">→</span></button>
        </section>
      </div>
      <section className="panel activity-panel">
        <div className="panel-heading"><div><h2>Records are live</h2><p>Counts and lists on this page are read from the connected Supabase project.</p></div><span className="muted-label">Supabase</span></div>
        <div className="empty-state"><strong>{chapters.length} chapter records · {applications.length} applications</strong><span>New chapter submissions appear here after successful registration.</span></div>
      </section>
    </>
  )
}

function ChapterManagement({ mode, chapters, query, setQuery, status, setStatus, updateStatus, editChapter, canManage }: {
  mode: 'Applications' | 'Chapters'
  chapters: Chapter[]
  query: string
  setQuery: (value: string) => void
  status: 'All submissions' | Status
  setStatus: (value: 'All submissions' | Status) => void
  updateStatus: (id: string, status: Status) => void
  editChapter: (chapter: Chapter) => void
  canManage: boolean
}) {
  return (
    <>
      <div className="toolbar panel">
        <label className="search-field"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search chapters, institutions or contacts" aria-label="Search chapters" /></label>
        <select aria-label="Filter applications" value={status} onChange={(event) => setStatus(event.target.value as typeof status)}>
          <option>All submissions</option><option>Pending review</option><option>Approved</option><option>Needs information</option><option>Rejected</option>
        </select>
      </div>
      <section className="panel table-panel">
        <div className="panel-heading"><div><h2>{mode === 'Applications' ? 'Submitted applications' : 'Published chapters'}</h2><p>{chapters.length} records from Supabase</p></div><button className="icon-button" aria-label="Refresh records" onClick={() => window.location.reload()}>↻</button></div>
        {chapters.length ? <ChapterTable chapters={chapters} onReview={mode === 'Chapters' ? editChapter : undefined} updateStatus={mode === 'Applications' ? updateStatus : undefined} canManage={canManage} /> : <div className="empty-state"><strong>{mode === 'Applications' ? 'No applications yet' : 'No published chapters yet'}</strong><span>Records from Supabase will appear here when available.</span></div>}
      </section>
    </>
  )
}

function ChapterTable({ chapters, compact = false, onReview, updateStatus, canManage = true }: {
  chapters: Chapter[]
  compact?: boolean
  onReview?: (chapter: Chapter) => void
  updateStatus?: (id: string, status: Status) => void
  canManage?: boolean
}) {
  return (
    <div className="table-scroll">
      <table className="data-table">
        <thead><tr><th>CHAPTER / INSTITUTION</th><th>STATE</th><th>CONTACT</th>{!compact && <th>SUBMITTED</th>}<th>STATUS</th><th><span className="sr-only">Actions</span></th></tr></thead>
        <tbody>{chapters.map((chapter) => (
          <tr key={chapter.id}>
            <td><div className="chapter-cell"><span className="chapter-avatar">{chapter.name.replace('NACOS ', '').slice(0, 2)}</span><span><strong>{chapter.name}</strong><small>{chapter.institution}</small></span></div></td>
            <td>{chapter.state}</td>
            <td>{chapter.president}</td>
            {!compact && <td>{chapter.submitted}</td>}
            <td><StatusPill status={chapter.status} /></td>
            <td>
              {chapter.status === 'Pending review' && updateStatus && canManage
                ? <div className="row-actions"><button className="approve-button" onClick={() => { void updateStatus(chapter.id, 'Approved') }}>Approve</button><button className="reject-button" onClick={() => { void updateStatus(chapter.id, 'Pending review') }}>Start review</button></div>
                : onReview && canManage ? <button className="icon-button" aria-label={`Edit ${chapter.name}`} onClick={() => onReview(chapter)}>•••</button> : <span className="dash">—</span>}
            </td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  )
}

function LeadershipManagement({ executives, add, edit, canManage }: { executives: Executive[]; add: () => void; edit: (item: Executive) => void; canManage: boolean }) {
  return (
    <section className="panel table-panel">
      <div className="panel-heading"><div><h2>Executive profiles</h2><p>Profiles grouped by zonal leadership term</p></div>{canManage && <button className="button primary small" onClick={add}>＋ Add executive</button>}</div>
      <div className="table-scroll"><table className="data-table"><thead><tr><th>EXECUTIVE</th><th>POSITION</th><th>INSTITUTION</th><th>TERM</th><th>STATE</th><th /></tr></thead><tbody>
        {executives.map((item) => <tr key={item.id}><td><div className="chapter-cell"><span className="person-avatar">{item.name.split(' ').map((part) => part[0]).join('').slice(0, 2)}</span><strong>{item.name}</strong></div></td><td>{item.position}</td><td>{item.institution}</td><td><span className="term-tag">{item.term}</span></td><td>{item.state}</td><td>{canManage && <button className="icon-button" onClick={() => edit(item)} aria-label={`Edit ${item.name}`}>•••</button>}</td></tr>)}
      </tbody></table></div>
    </section>
  )
}

function MediaManagement({ client, media, add, edit, remove, canManage }: { client: AuthenticatedAdmin['client']; media: Media[]; add: () => void; edit: (item: Media) => void; remove: (id: string) => void; canManage: boolean }) {
  return (
    <>
      <section className="panel table-panel">
        <div className="panel-heading"><div><h2>Historical media</h2><p>Manage archive metadata and media records</p></div>{canManage && <button className="button primary small" onClick={add}>＋ Add media</button>}</div>
        <div className="media-notice"><strong>Private storage is connected.</strong> JPEG, PNG, and WebP images (5 MB max) go to the media bucket; PDF documents (10 MB max) go to the private documents bucket. Only published non-document items are viewable on the public site.</div>
        <div className="table-scroll"><table className="data-table"><thead><tr><th>MEDIA ITEM</th><th>CATEGORY</th><th>YEAR</th><th>FILE</th><th>PUBLICATION</th><th /></tr></thead><tbody>
          {media.map((item) => <tr key={item.id}>
            <td><div className="chapter-cell"><span className="media-placeholder">▧</span><strong>{item.title}</strong></div></td>
            <td><span className="category-tag">{item.category}</span></td>
            <td>{item.year}</td>
            <td>{item.file_path && item.storage_bucket
              ? <StoredMediaLink client={client} item={item} />
              : <span className="muted-label">No file uploaded</span>}</td>
            <td><span className={`status-pill ${item.is_published && item.category !== 'documents' ? 'approved' : 'pending'}`}>{item.category === 'documents' ? 'Private' : item.is_published ? 'Published' : 'Unpublished'}</span></td>
            <td>{canManage && <div className="row-actions"><button className="text-button" onClick={() => edit(item)}>Edit</button><button className="reject-button" onClick={() => remove(item.id)}>Remove</button></div>}</td>
          </tr>)}
        </tbody></table></div>
        {!media.length && <div className="empty-state"><strong>No media records yet</strong><span>Add an archive item to upload a photo or private PDF.</span></div>}
      </section>
    </>
  )
}

function StoredMediaLink({ client, item }: { client: AuthenticatedAdmin['client']; item: Media }) {
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')
  useEffect(() => {
    if (!item.file_path || !item.storage_bucket) return
    let active = true
    void clientSignedUrl(client, item.storage_bucket, item.file_path).then((value) => {
      if (active) setUrl(value)
    }).catch((loadError: unknown) => {
      if (active) setError(loadError instanceof Error ? loadError.message : 'Could not create a secure file link.')
    })
    return () => { active = false }
  }, [client, item.file_path, item.storage_bucket])

  if (error) return <span className="muted-label" title={error}>File link unavailable</span>
  if (!url) return <span className="muted-label">Preparing secure link…</span>
  return <a className="text-button" href={url} target="_blank" rel="noreferrer">Open file ↗</a>
}

async function clientSignedUrl(client: AuthenticatedAdmin['client'], bucket: string, path: string) {
  const { data, error } = await client.storage.from(bucket).createSignedUrl(path, 600)
  if (error) throw new Error(error.message)
  if (!data.signedUrl) throw new Error('Supabase did not return a secure file link.')
  return data.signedUrl
}

function Invitations({ chapters, onCreate }: {
  chapters: Chapter[]
  onCreate: (email: string, phone: string, chapterId: string, expiresInHours: number) => Promise<{ url: string; expiresAt: string }>
}) {
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [chapterId, setChapterId] = useState('')
  const [expiresInHours, setExpiresInHours] = useState(168)
  const [invitationUrl, setInvitationUrl] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [busy, setBusy] = useState(false)

  const create = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    setInvitationUrl('')
    setCopied(false)
    try {
      const invitation = await onCreate(email.trim(), phone.trim(), chapterId, expiresInHours)
      setInvitationUrl(invitation.url)
      setExpiresAt(invitation.expiresAt)
    } catch (inviteError) {
      setError(inviteError instanceof Error ? inviteError.message : 'Could not create the chapter invitation.')
    } finally {
      setBusy(false)
    }
  }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(invitationUrl)
      setCopied(true)
    } catch {
      setError('Could not copy automatically. Select and copy the invitation link below.')
    }
  }

  return (
    <>
      <section className="invite-hero panel">
        <span className="invite-icon">✉</span>
        <div><h2>Create a secure chapter invitation</h2><p>Generate a one-time link for a representative whose identity you have verified.</p></div>
      </section>
      <section className="panel table-panel">
        <div className="panel-heading"><div><h2>Prepare invitation link</h2><p>The raw token is shown once. Store or share it only with the verified representative.</p></div></div>
        <form className="subadmin-invite-form chapter-invite-form" onSubmit={create}>
          <label>Representative email<input type="email" autoComplete="email" maxLength={254} required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
          <label>Phone / WhatsApp (optional)<input type="tel" maxLength={40} value={phone} onChange={(event) => setPhone(event.target.value)} /></label>
          <label>Link to existing chapter (optional)
            <select value={chapterId} onChange={(event) => setChapterId(event.target.value)}>
              <option value="">New chapter registration</option>
              {chapters.map((chapter) => <option key={chapter.id} value={chapter.id}>{chapter.name} — {chapter.institution}</option>)}
            </select>
          </label>
          <label>Link validity
            <select value={expiresInHours} onChange={(event) => setExpiresInHours(Number(event.target.value))}>
              <option value={24}>24 hours</option><option value={72}>3 days</option><option value={168}>7 days</option><option value={336}>14 days</option><option value={720}>30 days</option>
            </select>
          </label>
          {error && <p className="team-form-error" role="alert">{error}</p>}
          <button className="button primary small" type="submit" disabled={busy}>{busy ? 'Creating secure link…' : 'Create invitation link'}</button>
          <span className="muted-label">The portal generates and validates single-use links through Supabase. Email delivery is not configured; copy and send the link privately.</span>
        </form>
        {invitationUrl && <div className="media-notice invitation-result" role="status">
          <strong>Invitation link created.</strong>
          <span>Expires {formatDate(expiresAt)}. This token is displayed only now; copy it before leaving this page.</span>
          <div className="invitation-link-row"><input aria-label="Invitation link" readOnly value={invitationUrl} /><button className="button secondary small" type="button" onClick={() => { void copyLink() }}>{copied ? 'Copied' : 'Copy link'}</button></div>
        </div>}
      </section>
    </>
  )
}

function TeamAccess({ canManage, members, loading, error, onInvite, onManage, onReload }: {
  canManage: boolean
  members: Subadmin[]
  loading: boolean
  error: string
  onInvite: (name: string, email: string, permissions: string[]) => Promise<void>
  onManage: (id: string, permissions: string[], isActive: boolean) => Promise<void>
  onReload: () => void
}) {
  const [showInvite, setShowInvite] = useState(false)
  const [editing, setEditing] = useState<Subadmin | null>(null)

  if (!canManage) {
    return <section className="panel empty-state"><strong>General admin access required</strong><span>Only the general admin can create and manage subadmin accounts.</span></section>
  }

  return (
    <>
      <section className="panel table-panel">
        <div className="panel-heading"><div><h2>Subadmin accounts</h2><p>Each person receives an email invitation and chooses their own password.</p></div><button className="button primary small" onClick={() => setShowInvite((value) => !value)}>{showInvite ? 'Cancel' : '＋ Invite subadmin'}</button></div>
        {showInvite && <SubadminInviteForm onInvite={async (name, email, permissions) => { await onInvite(name, email, permissions); setShowInvite(false) }} />}
        {error && <div className="team-error" role="alert"><span>{error}</span><button className="text-button" onClick={onReload}>Try again</button></div>}
        <div className="table-scroll"><table className="data-table"><thead><tr><th>TEAM MEMBER</th><th>ROLE</th><th>ACCESS</th><th>STATUS</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>
          {loading
            ? <tr><td colSpan={5}>Loading team accounts…</td></tr>
            : members.length
              ? members.map((member) => (
                <tr key={member.id}>
                  <td><div className="chapter-cell"><span className="person-avatar">{member.full_name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()}</span><span><strong>{member.full_name}</strong><small>{member.email ?? 'No email returned by Auth'}</small></span></div></td>
                  <td>Subadmin</td>
                  <td>{member.permissions.map((permission) => permissionOptions.find((item) => item.value === permission)?.label ?? permission).join(', ') || 'No sections assigned'}</td>
                  <td>{member.is_active ? <span className={`status-pill ${member.invited ? 'pending' : 'approved'}`}>{member.invited ? 'Invitation pending' : 'Active'}</span> : <span className="status-pill rejected">Disabled</span>}</td>
                  <td><button className="text-button" type="button" onClick={() => setEditing(member)}>Manage access</button></td>
                </tr>
              ))
              : <tr><td colSpan={5}>No subadmin accounts have been invited yet.</td></tr>}
        </tbody></table></div>
        <div className="team-notes"><h3>Account security</h3><p>Subadmins set their own password from a private, expiring email link. The general admin never creates, sees, or shares another person's password.</p><p>Permissions are checked by Supabase policies and the account-management Edge Functions; hiding a screen in this UI is not the security boundary.</p></div>
      </section>
      {editing && <SubadminAccessDialog
        member={editing}
        onClose={() => setEditing(null)}
        onSave={async (permissions, isActive) => {
          await onManage(editing.id, permissions, isActive)
          setEditing(null)
        }}
      />}
    </>
  )
}

function SubadminAccessDialog({ member, onClose, onSave }: {
  member: Subadmin
  onClose: () => void
  onSave: (permissions: string[], isActive: boolean) => Promise<void>
}) {
  const [permissions, setPermissions] = useState(member.permissions)
  const [isActive, setIsActive] = useState(member.is_active)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (member.is_active && !isActive && !window.confirm(`Deactivate ${member.full_name}? Their next permission-checked request will be denied.`)) return
    setBusy(true)
    setError('')
    try {
      await onSave(permissions, isActive)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not update subadmin access.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose() }}>
      <section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="subadmin-access-title">
        <div className="modal-heading"><div><span className="eyebrow">Team & access</span><h2 id="subadmin-access-title">Manage {member.full_name}</h2></div><button className="icon-button" type="button" onClick={onClose} disabled={busy} aria-label="Close dialog">×</button></div>
        <form onSubmit={(event) => { void submit(event) }}>
          <div className="modal-fields">
            <fieldset className="access-permissions">
              <legend>Permissions</legend>
              {permissionOptions.map((permission) => (
                <label className="permission-option" key={permission.value}>
                  <input
                    type="checkbox"
                    checked={permissions.includes(permission.value)}
                    onChange={(event) => setPermissions((current) => event.target.checked
                      ? [...current, permission.value]
                      : current.filter((item) => item !== permission.value))}
                  />
                  {permission.label}
                </label>
              ))}
            </fieldset>
            <label className="access-active">
              <input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} />
              Account active
            </label>
          </div>
          <p className="muted-label">Deactivation retains the account and audit history but blocks permission-checked actions.</p>
          {error && <p className="team-form-error modal-error" role="alert">{error}</p>}
          <div className="modal-actions"><button className="button secondary" type="button" onClick={onClose} disabled={busy}>Cancel</button><button className="button primary" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save access'}</button></div>
        </form>
      </section>
    </div>
  )
}

function SubadminInviteForm({ onInvite }: {
  onInvite: (name: string, email: string, permissions: string[]) => Promise<void>
}) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [permissions, setPermissions] = useState<string[]>([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      await onInvite(name.trim(), email.trim(), permissions)
      setName('')
      setEmail('')
      setPermissions([])
    } catch (inviteError) {
      setError(inviteError instanceof Error ? inviteError.message : 'Could not send the invitation')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="subadmin-invite-form" onSubmit={submit}>
      <label>Full name<input autoComplete="name" maxLength={160} required value={name} onChange={(event) => setName(event.target.value)} /></label>
      <label>Gmail or email address<input autoComplete="email" type="email" maxLength={254} required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
      <fieldset>
        <legend>Assign access</legend>
        {permissionOptions.map((permission) => (
          <label className="permission-option" key={permission.value}>
            <input
              type="checkbox"
              checked={permissions.includes(permission.value)}
              onChange={(event) => setPermissions((current) => event.target.checked
                ? [...current, permission.value]
                : current.filter((item) => item !== permission.value))}
            />
            {permission.label}
          </label>
        ))}
      </fieldset>
      {error && <p className="team-form-error" role="alert">{error}</p>}
      <button className="button primary small" type="submit" disabled={busy || permissions.length === 0}>{busy ? 'Sending invitation…' : 'Send secure invitation'}</button>
      <span className="muted-label">The invitee receives an email link to set their own password.</span>
    </form>
  )
}

function FormModal({ config, close }: {
  config: { title: string; items: FormItem[]; initial?: Record<string, string>; onSave: (values: Record<string, string>, file?: File) => void | Promise<void> }
  close: () => void
}) {
  const [values, setValues] = useState<Record<string, string>>(config.initial ?? {})
  const [selectedFile, setSelectedFile] = useState<File>()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      await config.onSave(values, selectedFile)
      close()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save this record.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) close() }}>
      <section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="modal-heading"><div><span className="eyebrow">Admin workspace · Supabase</span><h2 id="modal-title">{config.title}</h2></div><button className="icon-button" onClick={close} aria-label="Close dialog">×</button></div>
        <form onSubmit={submit}>
          <div className="modal-fields">{config.items.map((item) => (
            <label className={`modal-field${item.type === 'checkbox' ? ' modal-checkbox-field' : ''}`} key={item.key}>{item.label}
              {item.options ? (
                <select required={item.required ?? true} value={values[item.key] ?? ''} onChange={(event) => setValues((current) => ({
                  ...current,
                  [item.key]: event.target.value,
                  ...(item.key === 'category' && event.target.value === 'Documents' ? { isPublished: 'false' } : {}),
                }))}>
                  <option value="">Select…</option>{item.options.map((option) => <option key={option}>{option}</option>)}
                </select>
              ) : item.type === 'file' ? (
                <input
                  type="file"
                  accept={item.accept}
                  required={item.required ?? true}
                  onChange={(event) => setSelectedFile(event.target.files?.[0])}
                />
              ) : item.type === 'checkbox' ? (
                <input
                  className="modal-checkbox"
                  type="checkbox"
                  checked={values[item.key] === 'true'}
                  disabled={item.key === 'isPublished' && values.category === 'Documents'}
                  onChange={(event) => setValues((current) => ({ ...current, [item.key]: String(event.target.checked) }))}
                />
              ) : (
                <input required={item.required ?? true} type={item.type ?? 'text'} value={values[item.key] ?? ''} onChange={(event) => setValues((current) => ({ ...current, [item.key]: event.target.value }))} />
              )}
            </label>
          ))}
            <p className="file-policy-note">Images: JPEG, PNG, or WebP up to 5 MB. Documents: PDF up to 10 MB, kept private. Publishing makes non-document items available to public visitors.</p>
          </div>
          {error && <p className="team-form-error modal-error" role="alert">{error}</p>}
          <div className="modal-actions"><button className="button secondary" type="button" onClick={close} disabled={busy}>Cancel</button><button className="button primary" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save to Supabase'}</button></div>
        </form>
      </section>
    </div>
  )
}

export default App
