/*
  frameCounter.ts — DEVELOPMENT ONLY. Counts how many times each 3D view redraws,
  so we can measure performance (fewer redraws = less work for the graphics chip).
  `import.meta.env.DEV` is false in the published site, so this does nothing there.
*/
export function countFrame(name: string) {
  if (!import.meta.env.DEV) return
  const w = window as unknown as { __frames?: Record<string, number> }
  w.__frames ??= {}
  w.__frames[name] = (w.__frames[name] ?? 0) + 1
}
