/*
  Icon.tsx — the site's small line icons, drawn as SVG so they stay sharp at any size.
  They are decoration: every button that uses one also has a text label for screen readers.
*/
const PATHS = {
  shapes: <><circle cx="10" cy="9" r="2.2" /><path d="M10 6.8V2.8M8.2 10.3 4 13.2M11.8 10.3 16 13.2M10 11.2v5" /></>,
  orbitals: <><ellipse cx="10" cy="5.6" rx="3.1" ry="3.6" /><ellipse cx="10" cy="14.4" rx="3.1" ry="3.6" /></>,
  polarity: <path d="M3.5 10h12M12 6.5l3.5 3.5-3.5 3.5M5.5 7.6v4.8" />,
  trends: <path d="M3.5 16.5v-4M8 16.5v-7M12.5 16.5V6.5M17 16.5v-13" />,
  reaction: <path d="M3 7h11.5M11.5 4l3 3-3 3M17 13H5.5M8.5 10l-3 3 3 3" />,
  protein: <path d="M3 13c2-6 4-6 5.5-1.5S12 16 14 9s2.6-5 3-4" />,
  enzymes: <><path d="M16.2 6.2A7 7 0 1 0 16.2 13.8L10.5 10z" /><circle cx="15.6" cy="10" r="1.2" /></>,
  lewis: <><path d="M4.5 10h3.5M12 10h3.5" /><circle cx="10" cy="6.3" r=".9" fill="currentColor" stroke="none" /><circle cx="10" cy="13.7" r=".9" fill="currentColor" stroke="none" /><circle cx="10" cy="10" r="1.6" /></>,
  mo: <path d="M3.5 15.5h4M12.5 15.5h4M7.5 6h5M7.5 12h5M7.5 12 5.5 15.5M12.5 12l2 3.5M7.5 6 5.5 15.5M12.5 6l2 9.5" />,
  practice: <><rect x="3.5" y="5.5" width="11" height="9" rx="2" /><path d="M6.5 3.5h8a2 2 0 0 1 2 2v6.5" /></>,
  sound: <><path d="M3.5 7.8h2.6L10 4.6v10.8L6.1 12.2H3.5z" /><path d="M13 7.6a3.4 3.4 0 0 1 0 4.8" /></>,
  soundOff: <><path d="M3.5 7.8h2.6L10 4.6v10.8L6.1 12.2H3.5z" /><path d="M13 8l4 4M17 8l-4 4" /></>,
  feedback: <path d="M3.5 4.5h13v9h-7l-3.5 3v-3h-2.5z" />,
  settings: <><path d="M4 6.5h6M14 6.5h2M4 13.5h2M10 13.5h6" /><circle cx="12" cy="6.5" r="2" /><circle cx="8" cy="13.5" r="2" /></>,
  menu: <path d="M3.5 6h13M3.5 10h13M3.5 14h13" />,
  close: <path d="M5 5l10 10M15 5 5 15" />,
  arrow: <path d="M4 10h12M11 5.5 15.5 10 11 14.5" />,
  chevron: <path d="M5.5 8 10 12.5 14.5 8" />,
  check: <path d="M4.5 10.5 8.5 14.5 15.5 6" />,
  reset: <><path d="M4.5 10a5.5 5.5 0 1 0 1.8-4.1" /><path d="M4 4.2v3.2h3.2" /></>,
  layers: <><path d="M10 3.5 3.5 7 10 10.5 16.5 7z" /><path d="M3.5 10.5 10 14l6.5-3.5" /></>,
} as const

export type IconName = keyof typeof PATHS

export default function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {PATHS[name]}
    </svg>
  )
}

/** The logo: a nucleus with three orbital rings. */
export function LogoMark({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" className="logo">
      <circle cx="12" cy="12" r="2.6" fill="url(#logo-grad)" />
      <g stroke="currentColor" strokeWidth="1.15">
        <ellipse cx="12" cy="12" rx="10.2" ry="3.9" />
        <ellipse cx="12" cy="12" rx="10.2" ry="3.9" transform="rotate(60 12 12)" />
        <ellipse cx="12" cy="12" rx="10.2" ry="3.9" transform="rotate(120 12 12)" />
      </g>
      <defs>
        <linearGradient id="logo-grad" x1="9" y1="9" x2="15" y2="15">
          <stop stopColor="#6fe3ff" />
          <stop offset="1" stopColor="#b594ff" />
        </linearGradient>
      </defs>
    </svg>
  )
}
