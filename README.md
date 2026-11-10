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
