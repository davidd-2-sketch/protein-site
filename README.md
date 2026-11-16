# protein-site (working name)

Free, interactive 3D chemistry for pre-med, organic chemistry, and biochemistry students.

## Run it on your computer

Open Terminal and run:

```bash
cd ~/Projects/protein-site
npm run dev
```

Then open http://localhost:5173 in your browser. Leave Terminal open while you work:
every time you save a file, the page updates by itself. Press `Ctrl + C` in Terminal to stop.

## Other commands

| Command | What it does |
|---|---|
| `npm install` | Re-downloads the code libraries (only needed on a new computer or after deleting `node_modules`) |
| `npm run build` | Makes the final, optimized website in the `dist/` folder, and checks for type errors |
| `npm run lint` | Scans the code for common mistakes |
| `npm test` | Runs the automated science checks in `tests/` (stereochemistry, angles, orbital nodes, element data, residue numbers). Run it after any change to science content. |

## Where things live

```
src/
  main.tsx        Starts the app
  App.tsx         Top bar + which page shows for which URL
  styles/         theme.css (all colors, fonts, sizes) and global.css (shared building blocks)
  nav/            courses.ts: which topics belong to General Chem, Organic, and Biochem
  components/     Reusable pieces. TopBar (menus), TopicLayout (the ONE layout every
                  topic page uses), SettingsPanel, SiteFooter, HeroMolecule
  pages/          One file per page: Home, About, Practice, and each topic
  lessons/        Lesson panel, glossary (word definitions), saved place in lessons
  practice/       Flashcard questions and their visuals
  three/          Shared 3D helpers (quality3d.ts applies the "faster graphics" setting)
  perf/           Graphics quality choice, and "wait until the page has appeared"
  protein/        Mol* protein viewer
  reactions/, vsepr/, orbitals/, trends/, polarity/, enzymes/
                  The 3D scene and checked data for each topic
  data/           Structure files and science notes with sources
scripts/          make-contours.mjs draws the home page's background lines (public/contours.svg)
public/fonts/     The Inter font, hosted on this site
mockups/          The design mockups the redesign was built from
```

## Honesty labels

- **Experimental structure**: atom positions measured in a lab (from the Protein Data Bank).
- **Illustrative**: simplified or animated to teach. Start/end shapes are accurate; the motion between is a teaching model.

## Free, with no accounts

The site is free and always will be: no accounts, no sign-in, no paid tiers. There is no
Progress page either. The only things saved are small helpers: check marks on finished
lessons, "Continue where you left off", and which practice cards to bring back. They are
kept in your browser on your own computer (localStorage); nothing is uploaded. Clearing
your browser data, or using a different browser or device, starts fresh. "Reset my saved
data" is under the settings icon in the top bar.

## Visitor analytics

The live site uses [Vercel Web Analytics](https://vercel.com/docs/analytics) to count visits.

- **What's tracked:** anonymous page views only, i.e. which pages (modules) are opened, like
  `/reaction` or `/protein`. Vercel also reports general, non-identifying info such as
  country, browser, device type, and the website a visitor came from.
- **What's not:** no cookies, no names, emails, or accounts, and no custom events. Vercel
  doesn't track individual visitors across days or across websites, so no cookie banner is needed.
- **Your own testing doesn't count:** analytics only runs in the published build, never
  with `npm run dev`.
- **Where to see the numbers:** [vercel.com](https://vercel.com) → your project →
  **Analytics** tab.
