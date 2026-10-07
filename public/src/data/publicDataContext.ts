import { createContext, useContext } from 'react'
import type { Chapter, Executive, LeadershipTerm, MediaItem } from './types'

export type Resource<T> = {
  records: T[]
  loading: boolean
  error: string
}

export type PublicData = {
  chapters: Resource<Chapter>
  executives: Resource<Executive>
  leadershipTerms: Resource<LeadershipTerm>
  mediaItems: Resource<MediaItem>
  reload: () => Promise<void>
}

export const PublicDataContext = createContext<PublicData | null>(null)

export function usePublicData() {
  const data = useContext(PublicDataContext)
  if (!data) throw new Error('usePublicData must be used within PublicDataProvider.')
  return data
}
