import type { SVGProps } from 'react'

const paths: Record<string, string> = {
  arrow: 'M5 12h14M13 6l6 6-6 6',
  back: 'M19 12H5m7 7-7-7 7-7',
  building: 'M3 21h18M6 21V5l6-3 6 3v16M9 9h1m4 0h1m-6 4h1m4 0h1m-5 8v-4h4v4',
  calendar: 'M8 2v4m8-4v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14H3V6a2 2 0 0 1 2-2Z',
  camera: 'M14 5l1.5 2H20a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h4.5L10 5h4Z M12 11a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z',
  check: 'm5 12 4 4L19 6',
  chevron: 'm9 18 6-6-6-6',
  close: 'm18 6-12 12M6 6l12 12',
  mail: 'M4 5h16v14H4z M4 7l8 6 8-6',
  menu: 'M4 7h16M4 12h16M4 17h16',
  pin: 'M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z M12 10a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z',
  search: 'm20 20-4.2-4.2M18 10.5a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z',
  upload: 'M12 16V4m0 0L7 9m5-5 5 5M4 16v4h16v-4',
  users: 'M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2m6-10a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm10 10v-2a4 4 0 0 0-3-3.87m-1-12.13a4 4 0 0 1 0 7.75',
}

type IconProps = SVGProps<SVGSVGElement> & { name: keyof typeof paths }

export function Icon({ name, ...props }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      className="icon"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.7"
      viewBox="0 0 24 24"
      {...props}
    >
      <path d={paths[name]} />
    </svg>
  )
}
