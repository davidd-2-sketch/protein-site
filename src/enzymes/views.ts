/*
  views.ts — what the 3D viewer shows for each enzyme structure: chains, bound molecules,
  colored residue groups, and the labels pinned to them. Pure data (no Mol* code), so the
  page, the lessons, and Practice can all use it.
*/
import type { ChainStyles, ResidueRef } from '../protein/ProteinViewer'
import type { PinLabel } from '../lessons/types'
import { CHYMO_ALIGN, CHYMO_SITE, GK_ALIGN, GK_GLUCOSE_SITE, GK_OPEN_MISSING, GK_POCKET_SIDES, STRUCTURES, type SiteGroup, type SiteResidue, type StructureId } from './structures'

/** One color per kind of residue, used in 3D, in the residue list, and in the color key. */
export const GROUP_COLORS: Record<SiteGroup | 'lid', string> = {
  triad: '#5ee4ff',
  oxyanion: '#ffc94d',
  pocket: '#b68cff',
  glucose: '#4fe3b0',
  activator: '#ff9ee6',
  lid: '#ff9a3d',
}

export const GROUP_NAMES: Record<SiteGroup | 'lid', string> = {
  triad: 'Catalytic triad',
  oxyanion: 'Oxyanion hole',
  pocket: 'Specificity (S1) pocket',
  glucose: 'Glucose-binding residues',
  activator: 'Activator',
  lid: 'Lid (swings shut)',
}

const CHYMO_CHAINS: ChainStyles = {
  A: { label: 'A chain (res. 1–13)', color: '#6f7bb8' },
  B: { label: 'B chain (res. 16–146)', color: '#8790cc' },
  C: { label: 'C chain (res. 149–245)', color: '#a7add9' },
}
const GK_CHAINS: ChainStyles = { A: { label: 'Glucokinase', color: '#8f98cf' } }

/** The glucokinase lid residues, as plain residue records for lists and info. */
export const GK_LID: SiteResidue[] = GK_POCKET_SIDES.lid.map((seq, i) => ({
  chain: 'A',
  seq,
  comp: ['SER', 'PHE', 'PRO'][i],
  group: 'glucose' as const,
  role: 'Part of the lid that closes over glucose. It moves more than 10 Å between the open and closed forms.',
}))

export interface EnzymeView {
  structure: StructureId
  chains: string[]
  chainStyles: ChainStyles
  ligands: string[]
  groups: { group: SiteGroup | 'lid'; residues: ResidueRef[] }[]
  labels: PinLabel[]
  /** Residues the camera frames by default. */
  focus: ResidueRef[]
  /** Moves this structure to line up with its partner (so switching shows only real movement). */
  transform?: number[]
}

const refs = (list: SiteResidue[], group: SiteGroup) => list.filter((r) => r.group === group).map(({ chain, seq }) => ({ chain, seq }))

const chymoLabels = (bound: boolean): PinLabel[] => [
  { text: 'Ser195', at: { chain: 'C', seq: 195, atom: 'OG' }, tone: 'accent' },
  { text: 'His57', at: { chain: 'B', seq: 57, atom: 'NE2' }, tone: 'accent' },
  { text: 'Asp102', at: { chain: 'B', seq: 102, atom: 'CG' }, tone: 'accent' },
  { text: 'Oxyanion hole', at: { chain: 'C', seq: 193, atom: 'N' }, tone: 'warm' },
  { text: 'S1 pocket', at: { chain: 'C', seq: 216, atom: 'CA' } },
  ...(bound ? [{ text: 'Transition-state mimic', at: { chain: 'C', seq: 1, atom: 'CZ' } } as PinLabel] : []),
]

export const VIEWS: Record<StructureId, EnzymeView> = {
  'chymo-ts': {
    structure: 'chymo-ts',
    chains: ['A', 'B', 'C'],
    chainStyles: CHYMO_CHAINS,
    ligands: ['PBA'],
    groups: [
      { group: 'pocket', residues: refs(CHYMO_SITE, 'pocket') },
      { group: 'oxyanion', residues: refs(CHYMO_SITE, 'oxyanion') },
      { group: 'triad', residues: refs(CHYMO_SITE, 'triad') },
    ],
    labels: chymoLabels(true),
    focus: CHYMO_SITE.map(({ chain, seq }) => ({ chain, seq })),
  },
  'chymo-free': {
    structure: 'chymo-free',
    chains: ['A', 'B', 'C'],
    chainStyles: CHYMO_CHAINS,
    ligands: [],
    groups: [
      { group: 'pocket', residues: refs(CHYMO_SITE, 'pocket') },
      { group: 'oxyanion', residues: refs(CHYMO_SITE, 'oxyanion') },
      { group: 'triad', residues: refs(CHYMO_SITE, 'triad') },
    ],
    labels: chymoLabels(false),
    focus: CHYMO_SITE.map(({ chain, seq }) => ({ chain, seq })),
    transform: CHYMO_ALIGN.freeToBound,
  },
  'gk-closed': {
    structure: 'gk-closed',
    chains: ['A'],
    chainStyles: GK_CHAINS,
    ligands: ['GLC', 'MRK'],
    groups: [
      { group: 'glucose', residues: GK_GLUCOSE_SITE.map(({ chain, seq }) => ({ chain, seq })) },
      { group: 'lid', residues: GK_LID.map(({ chain, seq }) => ({ chain, seq })) },
    ],
    labels: [
      { text: 'Glucose', at: { chain: 'A', seq: 500, atom: 'C1' }, tone: 'accent' },
      { text: 'Lid', at: { chain: 'A', seq: 152, atom: 'CA' }, tone: 'warm' },
      { text: 'Activator (drug-like)', at: { chain: 'A', seq: 501, atom: 'S1' } },
    ],
    focus: [...GK_GLUCOSE_SITE, ...GK_LID].map(({ chain, seq }) => ({ chain, seq })),
  },
  'gk-open': {
    structure: 'gk-open',
    chains: ['A'],
    chainStyles: GK_CHAINS,
    ligands: [],
    groups: [
      // Thr168 and Lys169 aren't in the open structure (disordered), so only the rest are drawn.
      { group: 'glucose', residues: GK_GLUCOSE_SITE.filter((r) => r.seq < GK_OPEN_MISSING.from || r.seq > GK_OPEN_MISSING.to).map(({ chain, seq }) => ({ chain, seq })) },
      { group: 'lid', residues: GK_LID.map(({ chain, seq }) => ({ chain, seq })) },
    ],
    labels: [
      { text: 'Empty glucose site', at: { chain: 'A', seq: 205, atom: 'CG' }, tone: 'accent' },
      { text: 'Lid (open)', at: { chain: 'A', seq: 152, atom: 'CA' }, tone: 'warm' },
    ],
    focus: [...GK_GLUCOSE_SITE, ...GK_LID].filter((r) => r.seq < GK_OPEN_MISSING.from || r.seq > GK_OPEN_MISSING.to).map(({ chain, seq }) => ({ chain, seq })),
    transform: GK_ALIGN.openToClosed,
  },
}

/** Find what the lessons say about a clicked residue (or null if it isn't one of ours). */
export function siteInfo(structure: StructureId, chain: string, seq: number): (SiteResidue & { groupName: string; color: string }) | null {
  const list = STRUCTURES[structure].enzyme === 'Chymotrypsin' ? CHYMO_SITE : [...GK_GLUCOSE_SITE, ...GK_LID]
  const r = list.find((x) => x.chain === chain && x.seq === seq)
  if (!r) return null
  const group: SiteGroup | 'lid' = GK_LID.includes(r) ? 'lid' : r.group
  return { ...r, groupName: GROUP_NAMES[group], color: GROUP_COLORS[group] }
}
