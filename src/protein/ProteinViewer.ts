/*
  ProteinViewer.ts — our wrapper around Mol* (the protein viewer library).

  Mol* is powerful but complicated. This file hides that complexity behind a
  small set of friendly methods that the React page calls:

      const viewer = await ProteinViewer.create(containerDiv)
      await viewer.load('/structures/4hhb.bcif')
      await viewer.setView({ chains: ['A'], style: 'cartoon', color: 'rainbow', ... })
      viewer.onPick((info) => ...)          // user clicked something
      viewer.resetCamera()

  KEY MOL* IDEA: the "state tree".
  Mol* keeps everything as a tree of steps:
      file data → parsed model → structure → components (pieces) → representations (visuals)
  To change what's on screen, we add or delete nodes in that tree. We batch all
  changes for one view into a single "update" so the screen swaps in one frame.
*/
import { PluginContext } from 'molstar/lib/mol-plugin/context'
import { DefaultPluginSpec, PluginSpec } from 'molstar/lib/mol-plugin/spec'
import { PluginConfig } from 'molstar/lib/mol-plugin/config'
import { PluginBehaviors } from 'molstar/lib/mol-plugin/behavior'
import { StateTransforms } from 'molstar/lib/mol-plugin-state/transforms'
import { createStructureRepresentationParams } from 'molstar/lib/mol-plugin-state/helpers/structure-representation-params'
import { PostprocessingParams } from 'molstar/lib/mol-canvas3d/passes/postprocessing'
import { MolScriptBuilder as MS } from 'molstar/lib/mol-script/language/builder'
import type { Expression } from 'molstar/lib/mol-script/language/expression'
import { Script } from 'molstar/lib/mol-script/script'
import { Bond, Structure, StructureElement, StructureProperties as SP, StructureSelection } from 'molstar/lib/mol-model/structure'
import { Color } from 'molstar/lib/mol-util/color'
import { Vec3, Vec4 } from 'molstar/lib/mol-math/linear-algebra'
import type { StateObjectSelector } from 'molstar/lib/mol-state'
import type { PluginStateObject } from 'molstar/lib/mol-plugin-state/objects'
import { CHAINS, type ChainId } from './hemoglobin'
import { countFrame } from '../dev/frameCounter'

/* ---------------------------------------------------------------- public types */

export type RenderStyle = 'cartoon' | 'ball-and-stick' | 'spacefill' | 'line' | 'surface'
export type ColorMode = 'chain' | 'secondary' | 'rainbow' | 'element'

export interface ResidueRef {
  chain: ChainId
  seq: number
}

/** Everything that defines what's on screen. The page builds one of these per view. */
export interface ViewState {
  chains: ChainId[]
  style: RenderStyle
  color: ColorMode
  /** Show the heme groups of the visible chains. */
  hemes: boolean
  /** Residues drawn on top of the main style (e.g. key histidines), with cyan carbons. */
  highlights?: ResidueRef[]
  /** How highlighted residues are drawn. Spheres stand out more in a crowded view. */
  highlightStyle?: 'ball-and-stick' | 'spacefill'
  /** Float a text label (e.g. "GLU 6") next to each highlighted residue. */
  labelHighlights?: boolean
  /** Show hydrophobic side chains (orange) for the visible chains. */
  hydrophobic?: boolean
  /** Stretches of residues drawn atom-by-atom (ball-and-stick, colored by element). Used by lessons. */
  detail?: ResidueRange[]
  /** Draw only the backbone atoms (N, Cα, C, O) of the `detail` residues. */
  detailBackboneOnly?: boolean
  /** What a click selects. Defaults to whole residues for ribbons and single atoms otherwise. */
  pick?: 'residue' | 'atom'
}

export interface ResidueRange {
  chain: ChainId
  from: number
  to: number
}

/** One specific atom, e.g. { chain: 'A', seq: 2, atom: 'CA' }. */
export interface AtomRef {
  chain: ChainId
  seq: number
  atom: string
}

export interface AtomInfo {
  chain: ChainId
  seq: number
  /** Three-letter residue code, e.g. "HIS" or "HEM" */
  comp: string
  atomName: string
  element: string
  secondary: 'helix' | 'sheet' | 'turn' | 'coil' | null
  position: Vec3
}

export type PickInfo =
  | { kind: 'atom'; atom: AtomInfo; granularity: 'residue' | 'atom' }
  | { kind: 'bond'; a: AtomInfo; b: AtomInfo; length: number; order: number }

/* ---------------------------------------------------------------- colors & constants */

const hex = (s: string) => Color(parseInt(s.slice(1), 16))

/** N→C rainbow, also used by the on-screen sequence strip so both always match. */
export const RAINBOW = ['#3f6bff', '#3fb8ff', '#4fe3b0', '#c6e84f', '#ffc94d', '#ff7a45', '#ff4d6a']

const SECONDARY_COLORS = { helix: '#e879c9', sheet: '#ffc94d', coil: '#b4b9d6' }
const HYDROPHOBIC_COLOR = '#ff9a3d'
const HIGHLIGHT_CARBON = '#5ee4ff'
const HEME_CARBON = '#c9cde6'
const DETAIL_CARBON = '#aab1d6'

// HYDROPHOBIC lives in bonds.ts (a tiny file), so lesson data can use it without loading Mol*.
import { HYDROPHOBIC } from './bonds'
export { HYDROPHOBIC }

/* ---------------------------------------------------------------- selection helpers */
// These build Mol* "MolScript" expressions: little queries like "all atoms in chain A".

const Q = MS.struct.atomProperty.macromolecular
const eq = (a: Expression, b: string | number) => MS.core.rel.eq([a, b])

const chainPolymer = (c: ChainId) =>
  MS.struct.generator.atomGroups({
    'chain-test': eq(Q.auth_asym_id(), c),
    'entity-test': eq(Q.entityType(), 'polymer'),
  })

const chainHeme = (c: ChainId) =>
  MS.struct.generator.atomGroups({
    'chain-test': eq(Q.auth_asym_id(), c),
    'residue-test': eq(Q.label_comp_id(), 'HEM'),
  })

/** Side chain + Cα only (skip N, C, O) so highlighted residues attach neatly to the ribbon. */
const notBackbone = MS.core.logic.not([MS.core.set.has([MS.set('N', 'C', 'O'), Q.label_atom_id()])])

const residues = (list: ResidueRef[]) =>
  MS.struct.generator.atomGroups({
    'residue-test': MS.core.logic.or(
      list.map((r) => MS.core.logic.and([eq(Q.auth_asym_id(), r.chain), eq(Q.auth_seq_id(), r.seq)])),
    ),
    'atom-test': notBackbone,
  })

const residueRanges = (list: ResidueRange[], backboneOnly: boolean) =>
  MS.struct.generator.atomGroups({
    'residue-test': MS.core.logic.or(
      list.map((r) => MS.core.logic.and([eq(Q.auth_asym_id(), r.chain), MS.core.rel.inRange([Q.auth_seq_id(), r.from, r.to])])),
    ),
    ...(backboneOnly ? { 'atom-test': MS.core.set.has([MS.set('N', 'CA', 'C', 'O'), Q.label_atom_id()]) } : {}),
  })

const hydrophobicSideChains = (chains: ChainId[]) =>
  MS.struct.generator.atomGroups({
    'chain-test': MS.core.set.has([MS.set(...chains), Q.auth_asym_id()]),
    'residue-test': MS.core.set.has([MS.set(...HYDROPHOBIC), Q.label_comp_id()]),
    'atom-test': notBackbone,
  })

/* ---------------------------------------------------------------- the viewer */

export class ProteinViewer {
  private plugin: PluginContext
  private structureRef?: StateObjectSelector<PluginStateObject.Molecule.Structure>
  private structure?: Structure
  /** References to everything we added for the current view, so we can remove it next time. */
  private viewRefs: string[] = []
  private pickListeners: ((p: PickInfo | null) => void)[] = []
  private hoverListeners: ((label: string | null) => void)[] = []
  private granularity: 'residue' | 'atom' = 'residue'

  /** The element this viewer owns. Removed completely in dispose(). */
  private root: HTMLDivElement
  private resizeObserver?: ResizeObserver

  private constructor(plugin: PluginContext, root: HTMLDivElement) {
    this.plugin = plugin
    this.root = root
  }

  /** Create the Mol* plugin inside a <div>. Returns once it's ready to draw. */
  static async create(container: HTMLDivElement): Promise<ProteinViewer> {
    // Only the behaviors we need. (Mol*'s defaults include its own UI helpers we don't use.)
    const spec: PluginSpec = {
      ...DefaultPluginSpec(),
      behaviors: [
        PluginSpec.Behavior(PluginBehaviors.Representation.HighlightLoci), // glow on hover
        PluginSpec.Behavior(PluginBehaviors.Representation.SelectLoci), // tint on select
        PluginSpec.Behavior(PluginBehaviors.Representation.DefaultLociLabelProvider),
        PluginSpec.Behavior(PluginBehaviors.Camera.CameraControls),
        PluginSpec.Behavior(PluginBehaviors.CustomProps.StructureInfo),
        PluginSpec.Behavior(PluginBehaviors.CustomProps.SecondaryStructure),
        PluginSpec.Behavior(PluginBehaviors.CustomProps.ValenceModel),
      ],
      config: [
        // PERFORMANCE: Retina screens have 2× pixel density, which means 4× the pixels to shade.
        // Cap the effective density at 1.5× (about 44% fewer pixels). Mol*'s "temporal
        // multisampling" sharpens edges again whenever the model stops moving.
        [PluginConfig.General.PixelScale, Math.min(1, 1.5 / (window.devicePixelRatio || 1))],
        // Don't force the high-power graphics chip (on some laptops that's a hotter, separate GPU).
        [PluginConfig.General.PowerPreference, 'default'],
        [PluginConfig.Viewport.ShowAnimation, false],
        [PluginConfig.Viewport.ShowSelectionMode, false],
      ],
    }
    const plugin = new PluginContext(spec)
    await plugin.init()

    // Each viewer gets its own wrapper <div>. When the viewer is disposed, the whole
    // wrapper (and its canvas) is removed, so an old canvas can never sit on top of a
    // new one. (In development, React starts pages twice on purpose to catch bugs
    // exactly like that.)
    const root = document.createElement('div')
    root.style.cssText = 'position:absolute;inset:0;'
    container.appendChild(root)
    const canvas = document.createElement('canvas')
    root.appendChild(canvas)
    const ok = await plugin.initViewerAsync(canvas, root)
    if (!ok) {
      root.remove()
      throw new Error('WebGL is not available in this browser.')
    }

    const viewer = new ProteinViewer(plugin, root)
    plugin.canvas3d?.didDraw.subscribe(() => countFrame('protein'))
    viewer.resizeObserver = new ResizeObserver(() => plugin.handleResize())
    viewer.resizeObserver.observe(root)
    viewer.applyRenderQuality()
    viewer.wireInteractions()
    return viewer
  }

  /* ----------------------------------------------------------- loading */

  async load(url: string) {
    const { plugin } = this
    // Binary files (.bcif) are ~35% smaller to download and much faster to read than text .cif.
    const isBinary = url.endsWith('.bcif')
    const data = await plugin.builders.data.download({ url, isBinary }, { state: { isGhost: true } })
    const trajectory = await plugin.builders.structure.parseTrajectory(data, 'mmcif')
    const model = await plugin.builders.structure.createModel(trajectory)
    // "model" = the atoms exactly as deposited. For 4HHB that's the full α₂β₂ tetramer.
    this.structureRef = await plugin.builders.structure.createStructure(model, { name: 'model', params: {} })
    this.structure = this.structureRef.data
  }

  /* ----------------------------------------------------------- building a view */

  /**
   * Replace everything on screen with what `view` describes, in one atomic update.
   */
  async setView(view: ViewState) {
    const { plugin, structureRef, structure } = this
    if (!structureRef || !structure) return

    this.setGranularity(view.pick ?? (view.style === 'cartoon' || view.style === 'surface' ? 'residue' : 'atom'))

    const update = plugin.build()
    for (const ref of this.viewRefs) update.delete(ref)
    this.viewRefs = []

    // Adds a component (a subset of atoms) + its visual, and remembers the reference.
    const add = (label: string, expression: Expression, repr: Parameters<typeof createStructureRepresentationParams>[2]) => {
      const component = update.to(structureRef).apply(
        StateTransforms.Model.StructureComponent,
        { type: { name: 'expression', params: expression }, nullIfEmpty: true, label },
        { tags: ['edu-view'] },
      )
      component.apply(StateTransforms.Representation.StructureRepresentation3D, createStructureRepresentationParams(plugin, structure, repr))
      this.viewRefs.push(component.ref)
    }

    // ---- The chains ----
    for (const c of view.chains) add(`Chain ${CHAINS[c].label}`, chainPolymer(c), this.chainRepr(c, view))

    // ---- Hemes (always ball-and-stick, colored by element, so the iron stands out) ----
    if (view.hemes) {
      for (const c of view.chains) {
        add(`Heme ${CHAINS[c].label}`, chainHeme(c), {
          type: view.style === 'spacefill' ? 'spacefill' : 'ball-and-stick',
          color: 'element-symbol',
          colorParams: { carbonColor: { name: 'uniform', params: { value: hex(HEME_CARBON), saturation: 0, lightness: 0 } } },
          typeParams: { sizeFactor: 0.28 },
        } as never)
      }
    }

    // ---- Detail residues: every atom shown, colored by element ----
    if (view.detail?.length) {
      add('Detail residues', residueRanges(view.detail, !!view.detailBackboneOnly), {
        type: 'ball-and-stick',
        color: 'element-symbol',
        colorParams: { carbonColor: { name: 'uniform', params: { value: hex(DETAIL_CARBON), saturation: 0, lightness: 0 } } },
        typeParams: { sizeFactor: 0.25 },
      } as never)
    }

    // ---- Hydrophobic side chains (orange) ----
    if (view.hydrophobic && view.chains.length) {
      add('Hydrophobic side chains', hydrophobicSideChains(view.chains), {
        type: 'ball-and-stick',
        color: 'uniform',
        colorParams: { value: hex(HYDROPHOBIC_COLOR) },
        typeParams: { sizeFactor: 0.2 },
      } as never)
    }

    // ---- Highlighted residues (cyan carbons) ----
    if (view.highlights?.length) {
      const spheres = view.highlightStyle === 'spacefill'
      add('Highlighted residues', residues(view.highlights), {
        type: spheres ? 'spacefill' : 'ball-and-stick',
        color: 'element-symbol',
        colorParams: { carbonColor: { name: 'uniform', params: { value: hex(HIGHLIGHT_CARBON), saturation: 0, lightness: 0 } } },
        typeParams: { sizeFactor: spheres ? 1 : 0.3 },
      } as never)

      if (view.labelHighlights) {
        add('Labels', residues(view.highlights), {
          type: 'label',
          color: 'uniform',
          colorParams: { value: hex('#ffffff') },
          typeParams: {
            level: 'residue',
            sizeFactor: 1.3,
            attachment: 'bottom-center',
            background: true,
            backgroundColor: hex('#141634'),
            backgroundOpacity: 0.9,
            backgroundMargin: 0.4,
          },
        } as never)
      }
    }

    await update.commit()
    plugin.managers.interactivity.lociSelects.deselectAll()
    // Mol* normally adds new visuals to the scene on the next animation frame.
    // Force it now, so the camera (moved right after this) frames the real objects.
    plugin.canvas3d?.commit(true)
    // With manualReset on, we also set the zoom-out limit ourselves, from what is now on screen
    // (otherwise a limit left over from a tiny scene could stop a big protein from fitting).
    const canvas3d = plugin.canvas3d
    // `radius` tells Mol* how big the scene is, which sets where the camera's near/far
    // cut-offs go. Without updating it, a bigger style (like Surface) gets sliced open.
    if (canvas3d && canvas3d.boundingSphere.radius > 0) {
      const r = canvas3d.boundingSphere.radius
      canvas3d.camera.setState({ radius: r, radiusMax: r * 3 }, 0)
    }
  }

  /** The visual for one chain, based on the chosen style and color mode. */
  private chainRepr(c: ChainId, view: ViewState) {
    // PERFORMANCE: the Gaussian surface is computed on the graphics chip and is much faster
    // than the exact "molecular surface" (computed on the processor). At this scale they look alike.
    const type = view.style === 'surface' ? 'gaussian-surface' : view.style
    const typeParams: Record<string, unknown> = {}
    // 'higher' (not 'highest'): fewer triangles, no visible difference at normal zoom.
    if (type === 'cartoon') Object.assign(typeParams, { quality: 'higher', sizeFactor: 0.25 })
    if (type === 'gaussian-surface') Object.assign(typeParams, { quality: 'high', smoothness: 1.5 })
    if (type === 'ball-and-stick') Object.assign(typeParams, { sizeFactor: 0.22 })

    switch (view.color) {
      case 'chain':
        return { type, typeParams, color: 'uniform', colorParams: { value: hex(CHAINS[c].color) } } as never
      case 'rainbow':
        return {
          type,
          typeParams,
          color: 'sequence-id',
          colorParams: { list: { kind: 'interpolate', colors: RAINBOW.map(hex) } },
        } as never
      case 'secondary':
        return {
          type,
          typeParams,
          color: 'secondary-structure',
          colorParams: {
            colors: {
              name: 'custom',
              params: {
                alphaHelix: hex(SECONDARY_COLORS.helix),
                threeTenHelix: hex(SECONDARY_COLORS.helix),
                piHelix: hex(SECONDARY_COLORS.helix),
                betaStrand: hex(SECONDARY_COLORS.sheet),
                betaTurn: hex(SECONDARY_COLORS.coil),
                turn: hex(SECONDARY_COLORS.coil),
                bend: hex(SECONDARY_COLORS.coil),
                coil: hex(SECONDARY_COLORS.coil),
                dna: hex(SECONDARY_COLORS.coil),
                rna: hex(SECONDARY_COLORS.coil),
                carbohydrate: hex(SECONDARY_COLORS.coil),
              },
            },
          },
        } as never
      case 'element':
        return {
          type,
          typeParams,
          color: 'element-symbol',
          colorParams: { carbonColor: { name: 'uniform', params: { value: hex(CHAINS[c].color), saturation: 0, lightness: 0 } } },
        } as never
    }
  }

  /* ----------------------------------------------------------- camera */

  /** Smoothly fit everything on screen. */
  resetCamera(durationMs = 900) {
    this.plugin.managers.camera.reset(undefined, durationMs)
  }

  /** Smoothly fly the camera to a set of residues. */
  focusResidues(list: ResidueRef[], extraRadius = 6, durationMs = 900) {
    if (!this.structure || !list.length) return
    const sel = Script.getStructureSelection(residues(list), this.structure)
    const loci = StructureSelection.toLociWithSourceUnits(sel)
    this.plugin.managers.camera.focusLoci(loci, { extraRadius, durationMs })
  }

  /** Slow automatic rotation on/off. */
  setSpin(on: boolean) {
    const canvas3d = this.plugin.canvas3d
    if (!canvas3d) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const spinning = on && !reduced
    // PERFORMANCE: spinning redraws every frame, so use cheaper soft shadows (half the
    // samples, half resolution) while it spins, and full quality again when it stops.
    const occ = canvas3d.props.postprocessing.occlusion
    canvas3d.setProps({
      trackball: {
        animate: spinning ? { name: 'spin', params: { speed: 0.12, axis: Vec3.create(0, 1, 0) } } : { name: 'off', params: {} },
      },
      postprocessing: {
        ...canvas3d.props.postprocessing,
        occlusion:
          occ.name === 'on'
            ? { name: 'on', params: { ...occ.params, samples: spinning ? 8 : 16, resolutionScale: spinning ? 0.5 : 1 } }
            : occ,
      },
    } as never)
  }

  /** Briefly highlight one residue (used when hovering a letter in the sequence strip). */
  highlightResidue(r: ResidueRef | null) {
    const { plugin, structure } = this
    if (!structure) return
    if (!r) {
      plugin.managers.interactivity.lociHighlights.clearHighlights()
      return
    }
    const expr = MS.struct.generator.atomGroups({
      'residue-test': MS.core.logic.and([eq(Q.auth_asym_id(), r.chain), eq(Q.auth_seq_id(), r.seq)]),
    })
    const loci = StructureSelection.toLociWithSourceUnits(Script.getStructureSelection(expr, structure))
    plugin.managers.interactivity.lociHighlights.highlightOnly({ loci })
  }

  /* ----------------------------------------------------------- positions & screen projection */

  /** 3D position of one atom, or null if it doesn't exist. */
  atomPosition(ref: AtomRef): Vec3 | null {
    if (!this.structure) return null
    const expr = MS.struct.generator.atomGroups({
      'residue-test': MS.core.logic.and([eq(Q.auth_asym_id(), ref.chain), eq(Q.auth_seq_id(), ref.seq)]),
      'atom-test': eq(Q.label_atom_id(), ref.atom),
    })
    const loci = StructureSelection.toLociWithSourceUnits(Script.getStructureSelection(expr, this.structure))
    const loc = StructureElement.Loci.getFirstLocation(loci)
    return loc ? Vec3.create(SP.atom.x(loc), SP.atom.y(loc), SP.atom.z(loc)) : null
  }

  /** Average position of a chain's Cα atoms: a good spot for a chain label. */
  chainCenter(chain: ChainId): Vec3 | null {
    if (!this.structure) return null
    const expr = MS.struct.generator.atomGroups({
      'chain-test': eq(Q.auth_asym_id(), chain),
      'atom-test': eq(Q.label_atom_id(), 'CA'),
    })
    const loci = StructureSelection.toLociWithSourceUnits(Script.getStructureSelection(expr, this.structure))
    const sphere = StructureElement.Loci.getBoundary(loci).sphere
    return Vec3.clone(sphere.center)
  }

  /**
   * Where a 3D point appears on screen, in CSS pixels from the top-left of the viewer.
   * `behind` is true when the point is behind the camera (don't draw a label then).
   */
  project(p: Vec3): { x: number; y: number; behind: boolean } | null {
    const canvas3d = this.plugin.canvas3d
    if (!canvas3d) return null
    const out = Vec4.zero()
    canvas3d.camera.project(out, p)
    const el = this.root
    // Mol* works in its own viewport pixels (which can differ from CSS pixels on Retina screens).
    const scale = canvas3d.camera.viewport.width / Math.max(1, el.clientWidth)
    // WebGL measures y from the bottom of the canvas; the page measures from the top.
    // out[3] is 1/w: it is negative when the point is behind the camera.
    return { x: out[0] / scale, y: el.clientHeight - out[1] / scale, behind: out[3] <= 0 }
  }

  /** Call `fn` after every frame is drawn (the camera may have moved). Returns an unsubscribe function. */
  onDraw(fn: () => void): () => void {
    const sub = this.plugin.canvas3d?.didDraw.subscribe(fn)
    return () => sub?.unsubscribe()
  }

  /* ----------------------------------------------------------- events */

  /** Listen for clicks. Returns a function that stops listening. */
  onPick(fn: (p: PickInfo | null) => void): () => void {
    this.pickListeners.push(fn)
    return () => {
      this.pickListeners = this.pickListeners.filter((f) => f !== fn)
    }
  }

  onHover(fn: (label: string | null) => void) {
    this.hoverListeners.push(fn)
  }

  dispose() {
    this.pickListeners = []
    this.hoverListeners = []
    this.resizeObserver?.disconnect()
    this.plugin.dispose()
    this.root.remove()
  }

  /* ----------------------------------------------------------- internals */

  /** Picking granularity: whole residues for ribbons/surfaces, single atoms for atomic styles. */
  private setGranularity(g: 'residue' | 'atom') {
    this.granularity = g
    this.plugin.managers.interactivity.setProps({ granularity: g === 'atom' ? 'element' : 'residue' })
  }

  /**
   * Turn on the effects that make Mol* look premium:
   *  - ambient occlusion: soft shadows where surfaces meet (gives real depth)
   *  - outlines: thin dark edges that make shapes read crisply
   *  - transparent background so our page's indigo backdrop shows through
   */
  private applyRenderQuality() {
    const canvas3d = this.plugin.canvas3d
    if (!canvas3d) return
    const pp = PostprocessingParams
    canvas3d.setProps({
      transparentBackground: true,
      renderer: {
        ...canvas3d.props.renderer,
        backgroundColor: hex('#070816'),
        selectColor: hex('#5ee4ff'),
        highlightColor: hex('#ffffff'),
        selectStrength: 0.55,
        exposure: 1.05,
      },
      postprocessing: {
        ...canvas3d.props.postprocessing,
        occlusion: {
          name: 'on',
          // 16 samples (Mol*'s default is 32): visually almost identical, half the work per pixel.
          params: { ...pp.occlusion.map('on').defaultValue, samples: 16, radius: 5, bias: 0.8, blurKernelSize: 13, resolutionScale: 1 },
        },
        outline: {
          name: 'on',
          params: { ...pp.outline.map('on').defaultValue, scale: 1, threshold: 0.33, color: hex('#05060f') },
        },
        shadow: { name: 'off', params: {} },
      },
      cameraFog: { name: 'on', params: { intensity: 35 } },
      // Hide Mol*'s small x/y/z orientation marker in the corner.
      // manualReset: we decide when the camera moves (Mol* would otherwise re-frame on its own
      // a moment after each scene change, undoing the lesson's camera).
      camera: { ...canvas3d.props.camera, manualReset: true, helper: { axes: { name: 'off', params: {} } } },
    } as never)
  }

  private wireInteractions() {
    const { plugin } = this

    plugin.behaviors.interaction.click.subscribe(({ current }) => {
      const info = this.describe(current.loci)
      if (info) plugin.managers.interactivity.lociSelects.selectOnly({ loci: current.loci }, true)
      else plugin.managers.interactivity.lociSelects.deselectAll()
      this.pickListeners.forEach((fn) => fn(info))
    })

    plugin.behaviors.interaction.hover.subscribe(({ current }) => {
      const info = this.describe(current.loci)
      let label: string | null = null
      if (info?.kind === 'atom') {
        const a = info.atom
        label = a.comp === 'HEM' ? `Heme · ${CHAINS[a.chain].label}` : `${a.comp} ${a.seq} · ${CHAINS[a.chain].label}`
        if (info.granularity === 'atom') label += ` · ${a.atomName}`
      } else if (info?.kind === 'bond') {
        label = `${info.a.atomName}–${info.b.atomName} bond · ${info.length.toFixed(2)} Å`
      }
      this.hoverListeners.forEach((fn) => fn(label))
    })
  }

  /** Turn whatever Mol* says was clicked into our simple PickInfo object. */
  private describe(loci: unknown): PickInfo | null {
    if (StructureElement.Loci.is(loci) && !StructureElement.Loci.isEmpty(loci)) {
      const loc = StructureElement.Loci.getFirstLocation(loci)
      if (!loc) return null
      const atom = atomInfo(loc)
      return atom ? { kind: 'atom', atom, granularity: this.granularity } : null
    }
    if (Bond.isLoci(loci) && loci.bonds.length) {
      const b = loci.bonds[0]
      const la = StructureElement.Location.create(loci.structure, b.aUnit, b.aUnit.elements[b.aIndex])
      const lb = StructureElement.Location.create(loci.structure, b.bUnit, b.bUnit.elements[b.bIndex])
      const a = atomInfo(la)
      const c = atomInfo(lb)
      if (!a || !c) return null
      const order = b.aUnit.kind === 0 ? Bond.getOrder(loci.structure, b as never) : 1
      return { kind: 'bond', a, b: c, length: Vec3.distance(a.position, c.position), order }
    }
    return null
  }
}

/** Read the properties we care about from one atom location. */
function atomInfo(loc: StructureElement.Location): AtomInfo | null {
  const chain = SP.chain.auth_asym_id(loc) as ChainId
  if (!(chain in CHAINS)) return null
  // Mol* stores secondary structure as bit flags. Values copied from Mol*'s
  // SecondaryStructureType.Flag (Helix = 2, Beta = 4, Turn = 16).
  const ssType = SP.residue.secondary_structure_type(loc) as number
  const is = (flag: number) => (ssType & flag) !== 0
  const F = { Helix: 2, Beta: 4, Turn: 16 }
  const comp = SP.atom.label_comp_id(loc)
  return {
    chain,
    seq: SP.residue.auth_seq_id(loc),
    comp,
    atomName: SP.atom.label_atom_id(loc),
    element: SP.atom.type_symbol(loc),
    secondary: comp === 'HEM' ? null : is(F.Helix) ? 'helix' : is(F.Beta) ? 'sheet' : is(F.Turn) ? 'turn' : 'coil',
    position: Vec3.create(SP.atom.x(loc), SP.atom.y(loc), SP.atom.z(loc)),
  }
}
