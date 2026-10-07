import { useCallback, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { supabase } from '../supabase'
import type { Chapter, Executive, LeadershipTerm, MediaItem } from './types'
import { PublicDataContext } from './publicDataContext'
import type { Resource } from './publicDataContext'

const initialResource = <T,>(): Resource<T> => ({ records: [], loading: true, error: '' })

function message(error: unknown) {
  return error instanceof Error ? error.message : 'The public records could not be loaded.'
}

function initials(name: string) {
  return name.replace(/^NACOS\s+/i, '').split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase()
}

const mediaCategories: Record<string, MediaItem['category']> = {
  leadership: 'Leadership',
  events: 'Events',
  community: 'Community',
  documents: 'Documents',
}

export function PublicDataProvider({ children }: { children: ReactNode }) {
  const [chapters, setChapters] = useState<Resource<Chapter>>(initialResource)
  const [executives, setExecutives] = useState<Resource<Executive>>(initialResource)
  const [leadershipTerms, setLeadershipTerms] = useState<Resource<LeadershipTerm>>(initialResource)
  const [mediaItems, setMediaItems] = useState<Resource<MediaItem>>(initialResource)

  const reload = useCallback(async () => {
    const client = supabase
    if (!client) {
      const error = 'Public records are not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, then rebuild the site.'
      setChapters({ records: [], loading: false, error })
      setExecutives({ records: [], loading: false, error })
      setLeadershipTerms({ records: [], loading: false, error })
      setMediaItems({ records: [], loading: false, error })
      return
    }

    setChapters((current) => ({ ...current, loading: true, error: '' }))
    setExecutives((current) => ({ ...current, loading: true, error: '' }))
    setLeadershipTerms((current) => ({ ...current, loading: true, error: '' }))
    setMediaItems((current) => ({ ...current, loading: true, error: '' }))

    try {
      const [chapterResult, executiveResult, termResult, mediaResult] = await Promise.all([
        client.from('chapters')
          .select('id, name, institution_name, state, institution_type, established_year, president_name, active_members, institution_address, description')
          .eq('status', 'approved')
          .eq('is_published', true)
          .order('state')
          .order('name'),
        client.from('executives')
          .select('id, full_name, position, institution, state, term_id, biography')
          .eq('is_published', true)
          .order('display_order'),
        client.from('leadership_terms')
          .select('id, title, start_year, end_year')
          .eq('is_published', true)
          .order('start_year', { ascending: false }),
        client.from('media_items')
          .select('id, title, category, year, file_path, storage_bucket')
          .eq('is_published', true)
          .neq('category', 'documents')
          .order('year', { ascending: false })
          .order('display_order'),
      ])

      setChapters(chapterResult.error
        ? { records: [], loading: false, error: chapterResult.error.message }
        : {
            records: (chapterResult.data ?? []).map((row) => ({
              id: row.id,
              name: row.name,
              institution: row.institution_name,
              state: row.state,
              type: row.institution_type,
              status: 'Recognized',
              president: row.president_name,
              established: row.established_year,
              members: row.active_members,
              address: row.institution_address,
              description: row.description,
              initials: initials(row.name),
            })),
            loading: false,
            error: '',
          })

      setLeadershipTerms(termResult.error
        ? { records: [], loading: false, error: termResult.error.message }
        : {
            records: (termResult.data ?? []).map((row) => ({
              id: row.id,
              label: row.title,
              year: row.start_year,
            })),
            loading: false,
            error: '',
          })

      const publishedTerms = new Set((termResult.data ?? []).map((term) => term.id))
      setExecutives(executiveResult.error
        ? { records: [], loading: false, error: executiveResult.error.message }
        : {
            records: (executiveResult.data ?? [])
              .filter((row) => publishedTerms.has(row.term_id))
              .map((row) => ({
                id: row.id,
                name: row.full_name,
                position: row.position,
                institution: row.institution,
                state: row.state,
                term: row.term_id,
                photo: null,
                bio: row.biography ?? '',
              })),
            loading: false,
            error: termResult.error?.message ?? '',
          })

      if (mediaResult.error) {
        setMediaItems({ records: [], loading: false, error: mediaResult.error.message })
      } else {
        const mapped = await Promise.all((mediaResult.data ?? []).map(async (row) => {
          let image: string | null = null
          let error = ''
          if (row.file_path && row.storage_bucket) {
            if (row.storage_bucket !== 'nacos-south-east') {
              error = `Published media "${row.title}" is not stored in the public-media bucket.`
            } else {
              const { data, error: signingError } = await client.storage
                .from(row.storage_bucket)
                .createSignedUrl(row.file_path, 3600)
              if (signingError) error = signingError.message
              else image = data.signedUrl
            }
          }
          return {
            record: {
              id: row.id,
              title: row.title,
              category: mediaCategories[row.category],
              year: row.year,
              image,
            },
            error,
          }
        }))
        const mediaError = mapped.find((item) => item.error)?.error ?? ''
        setMediaItems({
          records: mapped.map((item) => item.record),
          loading: false,
          error: mediaError,
        })
      }
    } catch (error) {
      const errorMessage = message(error)
      setChapters({ records: [], loading: false, error: errorMessage })
      setExecutives({ records: [], loading: false, error: errorMessage })
      setLeadershipTerms({ records: [], loading: false, error: errorMessage })
      setMediaItems({ records: [], loading: false, error: errorMessage })
    }
  }, [])

  useEffect(() => {
    void Promise.resolve().then(reload)
  }, [reload])

  return (
    <PublicDataContext.Provider value={{ chapters, executives, leadershipTerms, mediaItems, reload }}>
      {children}
    </PublicDataContext.Provider>
  )
}
