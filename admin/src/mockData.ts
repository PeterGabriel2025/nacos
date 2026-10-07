export type Status = 'Pending review' | 'Approved' | 'Needs information' | 'Rejected'

export type Chapter = {
  id: string
  name: string
  institution: string
  state: string
  president: string
  members: number
  status: Status
  submitted: string
}

export type Executive = {
  id: string
  name: string
  position: string
  institution: string
  term: string
  state: string
}

export type Media = { id: string; title: string; category: string; year: number }

export const initialChapters: Chapter[] = [
  { id: 'mouau', name: 'NACOS MOUAU', institution: 'Michael Okpara University of Agriculture', state: 'Abia', president: 'Chidera Okafor', members: 420, status: 'Approved', submitted: 'Sep 21, 2026' },
  { id: 'unn', name: 'NACOS UNN', institution: 'University of Nigeria, Nsukka', state: 'Enugu', president: 'Emeka Nwosu', members: 680, status: 'Approved', submitted: 'Sep 17, 2026' },
  { id: 'futo', name: 'NACOS FUTO', institution: 'Federal University of Technology, Owerri', state: 'Imo', president: 'Oluchi Eze', members: 510, status: 'Approved', submitted: 'Sep 12, 2026' },
  { id: 'unizik', name: 'NACOS UNIZIK', institution: 'Nnamdi Azikiwe University, Awka', state: 'Anambra', president: 'Ifeanyi Ekwueme', members: 390, status: 'Approved', submitted: 'Sep 09, 2026' },
  { id: 'esut', name: 'NACOS ESUT', institution: 'Enugu State University of Science and Technology', state: 'Enugu', president: 'Amaka Ugwu', members: 315, status: 'Approved', submitted: 'Sep 05, 2026' },
  { id: 'abia-poly', name: 'NACOS Abia Poly', institution: 'Abia State Polytechnic', state: 'Abia', president: 'Blessing Nnamdi', members: 186, status: 'Pending review', submitted: 'Today, 10:42 AM' },
  { id: 'ebsu', name: 'NACOS EBSU', institution: 'Ebonyi State University, Abakaliki', state: 'Ebonyi', president: 'Nnenna Okoro', members: 185, status: 'Pending review', submitted: 'Yesterday' },
  { id: 'imsu', name: 'NACOS IMSU', institution: 'Imo State University, Owerri', state: 'Imo', president: 'Chisom Nwachukwu', members: 240, status: 'Needs information', submitted: 'Sep 24, 2026' },
]

export const initialExecutives: Executive[] = [
  { id: '1', name: 'Amara Okeke', position: 'Zonal President', institution: 'University of Nigeria, Nsukka', term: '2025 — 2026', state: 'Enugu' },
  { id: '2', name: 'Obinna Eze', position: 'Vice President', institution: 'Federal University of Technology, Owerri', term: '2025 — 2026', state: 'Imo' },
  { id: '3', name: 'Chioma Uzo', position: 'General Secretary', institution: 'Michael Okpara University of Agriculture', term: '2025 — 2026', state: 'Abia' },
  { id: '4', name: 'Adaeze Nwankwo', position: 'Zonal President', institution: 'Nnamdi Azikiwe University, Awka', term: '2024 — 2025', state: 'Anambra' },
]

export const initialMedia: Media[] = [
  { id: '1', title: 'Zonal Leadership Retreat', category: 'Leadership', year: 2025 },
  { id: '2', title: 'South East Convention', category: 'Events', year: 2025 },
  { id: '3', title: 'Chapter Networking Session', category: 'Community', year: 2024 },
  { id: '4', title: 'Executive Handover', category: 'Leadership', year: 2023 },
]
