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
  styles/         theme.css (all colors/fonts/sizes) and global.css (shared building blocks)
  components/     Reusable pieces: top bar, loading screen
  pages/          One file per page: Home, Protein, Reaction
  protein/        Mol* viewer code (Phase 1)
  reactions/      Three.js reaction code + reaction data files (Phase 2)
  data/           Structure files and science notes with sources
```

## Honesty labels

- **Experimental structure**: atom positions measured in a lab (from the Protein Data Bank).
- **Illustrative**: simplified or animated to teach. Start/end shapes are accurate; the motion between is a teaching model.

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
