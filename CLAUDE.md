# Project rules (protein-site)

Free, interactive 3D chemistry for pre-med, general/organic chemistry, biochemistry, and
MCAT students. Vite + React + TypeScript, Three.js, and Mol* for proteins. Deployed on
Vercel from the `main` branch of github.com/davidd-2-sketch/protein-site.

## Who I'm working with
- The owner is a beginner programmer. Explain choices in plain language, say what a
  command does before running anything that installs software or changes the computer,
  and say clearly when they need to do something themselves.
- Ask clarifying questions (multiple choice is welcome) before building something new, and
  wait for an OK on plans for big features.

## Product rules (do not break)
- The site is free, forever: no accounts, no paid tiers or subscriptions, ever.
- There is no Progress page. The only saved state is the quiet kind that makes lessons
  pleasant: check marks on finished lessons, "Continue where you left off", and which
  practice cards to bring back. It lives only in the browser (`src/lessons/progress.ts`,
  localStorage keys starting with `ps.`). Don't change how existing keys are stored, so
  students never lose their place. `/progress` redirects to the home page.
- Do NOT add accounts, logins, sign-in, cloud sync, payments, AI chatbots or tutors,
  leaderboards, scores, streaks, points, badges, percentages, or other gamification.
  Practice shows no scores.
- Settings (3D graphics quality, "Reset my saved data") live in the top bar's settings
  popover (`src/components/SettingsPanel.tsx`).
- Every 3D model must carry an honesty label: **"Experimental structure"** (measured data,
  e.g. from the Protein Data Bank) or **"Illustrative"** (simplified, animated, or schematic).
  Energy diagrams are labeled "Schematic".
- Accuracy first. Use real data with sources recorded in `reference/`. Check residue
  numbers and names against the actual structure file, not memory. If unsure about a
  scientific detail, say so instead of guessing. Add automated science tests in `tests/`.
- Performance matters: the site must run smoothly on weak laptops and Chromebooks. New 3D
  views must use `src/three/quality3d.ts` (createRenderer, addLighting, glossy,
  sphereGeometry) so the "fast" graphics profile in `src/perf/quality.ts` applies.
  Don't prefetch the Mol* protein viewer on idle.
- Analytics: Vercel Web Analytics, page views only, production builds only. No custom events.

## Before every commit
Run all three and report any failure:
```
npm test
npm run lint
npm run build
```
Commit each feature separately with a clear message. The project has no code formatter:
do not run `npx prettier` (it downloads one and rewrites files in a different style).
