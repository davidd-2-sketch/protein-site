// parts.js — builds the pieces shared by every mockup (top bar, course menus, phone menu sheet),
// so each mockup page shows exactly the same navigation.
const I = (d, extra = '') => `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${d}</svg>`
const ICON = {
  shapes: I('<circle cx="10" cy="9" r="2.2"/><path d="M10 6.8V2.8M8.2 10.3 4 13.2M11.8 10.3 16 13.2M10 11.2v5"/>'),
  orbitals: I('<ellipse cx="10" cy="5.6" rx="3.1" ry="3.6"/><ellipse cx="10" cy="14.4" rx="3.1" ry="3.6"/>'),
  polarity: I('<path d="M3.5 10h12M12 6.5l3.5 3.5-3.5 3.5M5.5 7.6v4.8"/>'),
  trends: I('<path d="M3.5 16.5v-4M8 16.5v-7M12.5 16.5V6.5M17 16.5v-13"/>'),
  reaction: I('<path d="M3 7h11.5M11.5 4l3 3-3 3M17 13H5.5M8.5 10l-3 3 3 3"/>'),
  protein: I('<path d="M3 13c2-6 4-6 5.5-1.5S12 16 14 9s2.6-5 3-4"/>'),
  enzymes: I('<path d="M16.2 6.2A7 7 0 1 0 16.2 13.8L10.5 10z"/><circle cx="15.6" cy="10" r="1.2"/>'),
  practice: I('<rect x="3.5" y="5.5" width="11" height="9" rx="2"/><path d="M6.5 3.5h8a2 2 0 0 1 2 2v6.5"/>'),
  sound: I('<path d="M3.5 7.8h2.6L10 4.6v10.8L6.1 12.2H3.5z"/><path d="M13 7.6a3.4 3.4 0 0 1 0 4.8"/>'),
  soundOff: I('<path d="M3.5 7.8h2.6L10 4.6v10.8L6.1 12.2H3.5z"/><path d="M13 8l4 4M17 8l-4 4"/>'),
  feedback: I('<path d="M3.5 4.5h13v9h-7l-3.5 3v-3h-2.5z"/>'),
  settings: I('<path d="M4 6.5h6M14 6.5h2M4 13.5h2M10 13.5h6"/><circle cx="12" cy="6.5" r="2"/><circle cx="8" cy="13.5" r="2"/>'),
  chev: `<svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 4.5 6 7.5 9 4.5"/></svg>`,
  arrow: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3.5 8h9M9 4.5 12.5 8 9 11.5"/></svg>`,
  menu: I('<path d="M3.5 6h13M3.5 10h13M3.5 14h13"/>'),
  close: I('<path d="M5 5l10 10M15 5 5 15"/>'),
  logo: `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="2.6" fill="url(#lg)"/><g stroke="currentColor" stroke-width="1.15"><ellipse cx="12" cy="12" rx="10.2" ry="3.9"/><ellipse cx="12" cy="12" rx="10.2" ry="3.9" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="10.2" ry="3.9" transform="rotate(120 12 12)"/></g><defs><linearGradient id="lg" x1="9" y1="9" x2="15" y2="15"><stop stop-color="#6fe3ff"/><stop offset="1" stop-color="#b594ff"/></linearGradient></defs></svg>`,
}

// The course grouping. URLs are unchanged from today's site.
const COURSES = [
  {
    id: 'gen', name: 'General Chem', blurb: 'First-year chemistry',
    items: [
      { href: '/shapes', icon: 'shapes', title: 'Molecular shapes', desc: 'Why molecules bend, and how to predict their 3D shape.' },
      { href: '/orbitals', icon: 'orbitals', title: 'Orbitals', desc: 'Where electrons live, shown as 3D clouds.' },
      { href: '/polarity', icon: 'polarity', title: 'Polarity', desc: 'Which molecules have a + end and a − end, and why.' },
      { href: '/trends', icon: 'trends', title: 'Periodic trends', desc: 'How atoms change in size and pull across the table.' },
    ],
  },
  {
    id: 'org', name: 'Organic', blurb: 'Organic chemistry',
    items: [
      { href: '/reaction', icon: 'reaction', title: 'Reactions', desc: 'Watch bonds break and form, step by step (S<sub>N</sub>1 and S<sub>N</sub>2).' },
      { href: '/orbitals', icon: 'orbitals', title: 'Orbitals and hybridization', desc: 'sp, sp², sp³, and how single and double bonds form.' },
    ],
  },
  {
    id: 'bio', name: 'Biochem', blurb: 'Biochemistry and pre-med',
    items: [
      { href: '/protein', icon: 'protein', title: 'Proteins', desc: 'Build hemoglobin, from one amino acid to four chains.' },
      { href: '/enzymes', icon: 'enzymes', title: 'Enzymes', desc: 'How enzymes grab a molecule and speed up a reaction.' },
    ],
  },
]

function menuItems(course, current, focus) {
  return course.items.map((it) => `
    <a class="menu-item ${it.href === current ? 'current' : ''} ${it.href === focus ? 'focus' : ''}" href="#">
      <span class="menu-ico">${ICON[it.icon]}</span>
      <span><span class="menu-title">${it.title}${it.href === current ? '<span class="here-chip">You’re here</span>' : ''}</span>
      <span class="menu-desc">${it.desc}</span></span>
    </a>`).join('')
}

/** opts: { open: 'gen'|'org'|'bio'|null, here: course id or 'practice', current: '/enzymes', focus: '/polarity', sound: bool, tip: 'sound'|null } */
function topbar(opts = {}) {
  const { open = null, here = null, current = null, focus = null, sound = false, tip = null } = opts
  const nav = COURSES.map((c) => `
    <span style="position:relative">
      <button class="nav-item ${open === c.id ? 'open' : ''} ${here === c.id ? 'here' : ''}" aria-haspopup="true" aria-expanded="${open === c.id}">${c.name}${ICON.chev}</button>
      ${open === c.id ? `<div class="menu" style="top:52px;left:-8px" role="menu">${menuItems(c, current, focus)}</div>` : ''}
    </span>`).join('')
  return `
  <header class="topbar">
    <a class="brand" href="#">${ICON.logo}<span>protein-site</span></a>
    <nav class="nav" aria-label="Main">
      ${nav}
      <a class="nav-item ${here === 'practice' ? 'here' : ''}" href="#">Practice</a>
    </nav>
    <div class="bar-right">
      <span style="position:relative"><button class="icon-btn ${sound ? 'on' : ''}" aria-label="Sound effects: ${sound ? 'on' : 'off'}">${sound ? ICON.sound : ICON.soundOff}</button>${tip === 'sound' ? '<span class="tip" style="top:44px;right:-10px">Sound effects: off</span>' : ''}</span>
      <a class="icon-btn" href="#" aria-label="Send feedback">${ICON.feedback}</a>
      <button class="icon-btn" aria-label="Settings">${ICON.settings}</button>
    </div>
  </header>`
}

/** Compact bar used on phones and tablets. */
function phonebar(openSheet = false) {
  return `
  <header class="topbar" style="height:54px;padding:0 14px 0 16px;gap:10px">
    <a class="brand" href="#" style="font-size:15.5px">${ICON.logo}<span>protein-site</span></a>
    <div class="bar-right"><button class="btn sm" style="height:36px;gap:7px;padding:0 12px">${openSheet ? ICON.close + 'Close' : ICON.menu + 'Menu'}</button></div>
  </header>`
}

function phoneSheet(current) {
  const groups = COURSES.map((c) => `
    <p class="sheet-head">${c.name}</p>
    ${c.items.map((it) => `
      <a class="sheet-item ${it.href === current ? 'current' : ''}" href="#">
        <span class="menu-ico" style="width:36px;height:36px">${ICON[it.icon]}</span>
        <span><span class="menu-title">${it.title}${it.href === current ? '<span class="here-chip">You’re here</span>' : ''}</span><span class="menu-desc">${it.desc}</span></span>
      </a>`).join('')}`).join('')
  return `
  <div class="sheet-menu">
    ${groups}
    <p class="sheet-head">Practice</p>
    <a class="sheet-item" href="#"><span class="menu-ico" style="width:36px;height:36px">${ICON.practice}</span><span><span class="menu-title">Practice</span><span class="menu-desc">Calm flashcards for any topic.</span></span></a>
    <div class="sheet-foot">
      <button class="btn sm ghost">${ICON.soundOff} Sound off</button>
      <a class="btn sm ghost" href="#">${ICON.feedback} Feedback</a>
      <button class="btn sm ghost">${ICON.settings} Settings</button>
    </div>
  </div>`
}

// Fill any placeholder elements on the page.
document.querySelectorAll('[data-topbar]').forEach((el) => (el.outerHTML = topbar(JSON.parse(el.dataset.topbar || '{}'))))
document.querySelectorAll('[data-phonebar]').forEach((el) => (el.outerHTML = phonebar(el.dataset.phonebar === 'open')))
document.querySelectorAll('[data-sheet]').forEach((el) => (el.outerHTML = phoneSheet(el.dataset.sheet)))
document.querySelectorAll('[data-icon]').forEach((el) => (el.innerHTML = ICON[el.dataset.icon] + el.innerHTML))
