export type Chapter = {
  id: string
  name: string
  institution: string
  state: string
  type: string
  status: 'Recognized'
  president: string
  established: number
  members: number
  address: string
  description: string
  initials: string
}

export type Executive = {
  id: string
  name: string
  position: string
  institution: string
  state: string
  term: string
  photo: string | null
  bio: string
}

export type LeadershipTerm = {
  id: string
  label: string
  year: number
}

export type MediaItem = {
  id: string
  title: string
  category: 'Leadership' | 'Events' | 'Community' | 'Documents'
  year: number
  image: string | null
}

export const states = ['Abia', 'Anambra', 'Ebonyi', 'Enugu', 'Imo']
