/*
  elements.ts — friendly access to the element data, plus the four properties we can chart.
*/
import { ELEMENT_ROWS } from './elementData'

export type PropId = 'radius' | 'ie' | 'en' | 'ea'

export interface Element {
  z: number
  symbol: string
  name: string
  period: number
  /** 1–18, or null for the lanthanides and actinides. */
  group: number | null
  /** Where the cell is drawn (the f-block sits in two rows below the main table). */
  row: number
  col: number
  category: string
  config: string
  values: Record<PropId, number | null>
}

export const ELEMENTS: Element[] = ELEMENT_ROWS.map(([z, symbol, name, period, group, row, col, category, config, radius, ie, en, ea]) => ({
  z, symbol, name, period, group, row, col, category, config,
  values: { radius, ie, en, ea },
}))

export const byZ = (z: number) => ELEMENTS[z - 1]

/** Main-group elements: the s-block and p-block (groups 1, 2, and 13–18). */
export const isMainGroup = (e: Element) => e.group !== null && (e.group <= 2 || e.group >= 13)

/** Atomic numbers of the main-group elements in a period, left to right. */
export const periodZ = (period: number) => ELEMENTS.filter((e) => e.period === period && isMainGroup(e)).map((e) => e.z)
/** Atomic numbers of a group, top to bottom. */
export const groupZ = (group: number) => ELEMENTS.filter((e) => e.group === group).map((e) => e.z)
export const MAIN_GROUP_Z = ELEMENTS.filter(isMainGroup).map((e) => e.z)

export interface PropInfo {
  id: PropId
  name: string
  unit: string
  /** One plain sentence: what this number means. */
  blurb: string
  /** Bar color (each property keeps its own color everywhere on the page). */
  color: string
  /** Largest value in the data, used to scale bar heights. */
  max: number
  source: string
}

const maxOf = (id: PropId) => Math.max(...ELEMENTS.map((e) => e.values[id] ?? 0))

export const PROPS: PropInfo[] = [
  {
    id: 'radius',
    name: 'Atomic radius',
    unit: 'pm',
    blurb: 'How big the atom is.',
    color: '#5ee4ff',
    max: maxOf('radius'),
    source: 'Calculated radii (Clementi et al., 1967). Elements 1–86.',
  },
  {
    id: 'ie',
    name: 'Ionization energy',
    unit: 'kJ/mol',
    blurb: 'Energy needed to pull one electron off the atom.',
    color: '#a78bfa',
    max: maxOf('ie'),
    source: 'First ionization energy, from PubChem (NIH).',
  },
  {
    id: 'en',
    name: 'Electronegativity',
    unit: 'Pauling scale',
    blurb: 'How strongly the atom pulls on electrons it shares in a bond.',
    color: '#ffc94d',
    max: maxOf('en'),
    source: 'Pauling scale, from PubChem (NIH).',
  },
  {
    id: 'ea',
    name: 'Electron affinity',
    unit: 'kJ/mol',
    blurb: 'Energy released when the atom gains one electron.',
    color: '#4fe3b0',
    max: maxOf('ea'),
    source: 'From PubChem (NIH). Blank where the negative ion is unstable or unmeasured.',
  },
]

export const propInfo = (id: PropId) => PROPS.find((p) => p.id === id)!

/** "167 pm", "3.98", or "no value". */
export function formatValue(id: PropId, v: number | null) {
  if (v === null) return 'no value'
  return id === 'en' ? v.toFixed(2) : `${v} ${propInfo(id).unit}`
}
