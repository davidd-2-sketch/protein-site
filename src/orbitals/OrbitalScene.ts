/*
  OrbitalScene.ts — draws orbitals as 3D surfaces (built on Stage3D).

  For each orbital we:
    1. sample its wavefunction ψ on a 3D grid (wavefunctions.ts),
    2. find the threshold whose surface encloses 90% of the probability,
    3. turn the grid into a surface with "marching cubes" (three.js's MarchingCubes),
       once for the + phase (ψ above the threshold) and once for the − phase.

  Phases: + is blue; − is orange AND drawn with a fine mesh pattern, so the two phases
  can be told apart without relying on color.

  PERFORMANCE: building a surface takes noticeable work, so surfaces are built one per
  animation frame (the page never freezes) and cached, so revisiting a view is instant.

  AXES: chemistry convention puts z "up". three.js uses y as up, so every surface is
  rotated (a proper rotation, not a mirror image) so that the chemist's z points up the screen.
*/
import * as THREE from 'three'
import { MarchingCubes } from 'three/examples/jsm/objects/MarchingCubes.js'
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { Stage3D } from '../three/Stage3D'
import { glossy } from '../three/quality3d'
import { settings } from '../perf/quality'
import { BOHR, BONDS, HYBRID_SETS, ORBITALS, hybrid, isoForFraction, sampleGrid, type Fn } from './wavefunctions'

export type OrbitalView = (
  | { kind: 'orbital'; id: string }
  | { kind: 'set'; ids: string[] }
  | { kind: 'hybrids'; set: 'sp' | 'sp2' | 'sp3'; only?: number; leftover?: boolean }
  | { kind: 'bond'; id: string }
) & {
  /** Remove the front half to reveal inner structure (like nodes). */
  cutaway?: boolean
  /** Camera framing radius in Å. Set the same value on two steps to compare sizes fairly. */
  fit?: number
}

const PLUS = '#4f8bff'
const MINUS = '#ff8a3d'
/** Colors to tell several orbitals apart when shown together (phase shown by the mesh pattern). */
const SET_COLORS = ['#5ee4ff', '#b9a6ff', '#4fe3b0', '#ffc94d', '#ff7ab0']

/** One surface to draw: which function, which sign, and how. */
interface Piece {
  key: string
  fn: Fn
  extent: number // a₀
  sign: 1 | -1
  color: string
  pattern: boolean // the − phase gets a mesh pattern
  isoKey: string // pieces sharing an isoKey share a 90% threshold
  opacity?: number
}

export class OrbitalScene {
  readonly stage: Stage3D
  private gen: MarchingCubes
  private cache = new Map<string, THREE.BufferGeometry>()
  private isoCache = new Map<string, number>()
  private group = new THREE.Group()
  private nuclei = new THREE.Group()
  private axes: THREE.Group
  private clip = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0)
  private token = 0
  private cutaway = false
  private onBusy: (busy: boolean) => void
  /**
   * Grid points per side: 64 on detailed computers, 40 on fast ones (4× fewer calculations).
   * The surface still encloses 90% of the probability; it is just slightly less smooth.
   */
  private n = settings().orbitalGrid

  constructor(container: HTMLElement, onBusy: (busy: boolean) => void = () => {}) {
    this.onBusy = onBusy
    this.stage = new Stage3D(container, 'orbitals')
    this.stage.renderer.localClippingEnabled = true
    this.gen = new MarchingCubes(this.n, new THREE.MeshBasicMaterial(), false, false, 160000)
    this.axes = makeAxes()
    this.stage.scene.add(this.group, this.nuclei, this.axes)
    this.stage.fit(4, true)
  }

  setAxes(on: boolean) {
    this.axes.visible = on
    this.stage.requestRender()
  }

  /** Axis-end positions for HTML labels (x, y, z), in scene coordinates. */
  axisLabelPositions() {
    const L = this.axisLength
    return [
      { text: 'x', position: new THREE.Vector3(L, 0, 0) },
      { text: 'y', position: new THREE.Vector3(0, 0, -L) }, // chemistry +y points away from the default camera
      { text: 'z', position: new THREE.Vector3(0, L, 0) },
    ]
  }
  private axisLength = 3

  /** Show a new view. Surfaces build over the next few frames; older requests are cancelled. */
  async setView(view: OrbitalView) {
    const token = ++this.token
    this.cutaway = !!view.cutaway
    const pieces = this.piecesFor(view)
    this.onBusy(true)

    const meshes: THREE.Object3D[] = []
    for (const piece of pieces) {
      if (!this.cache.has(this.geoKey(piece))) await nextFrame() // spread heavy work across frames
      if (token !== this.token) return // a newer view was requested meanwhile
      meshes.push(...this.meshFor(piece))
    }
    if (token !== this.token) return

    // Swap in the new surfaces all at once.
    this.group.clear()
    meshes.forEach((m) => this.group.add(m))
    this.setNuclei(view)

    const box = new THREE.Box3().setFromObject(this.group)
    const radius = view.fit ?? Math.max(1, box.getBoundingSphere(new THREE.Sphere()).radius)
    this.axisLength = radius * 1.05
    this.axes.scale.setScalar(this.axisLength)
    this.stage.fit(radius * 1.08)
    this.onBusy(false)
    this.stage.requestRender()
  }

  dispose() {
    this.token++
    this.cache.forEach((g) => g.dispose())
    this.gen.geometry.dispose()
    this.stage.dispose()
  }

  /* ----------------------------------------------------------- what to draw */

  private piecesFor(view: OrbitalView): Piece[] {
    const both = (key: string, fn: Fn, extent: number, color?: string, isoKey = key): Piece[] => [
      { key, fn, extent, sign: 1, color: color ?? PLUS, pattern: false, isoKey },
      { key, fn, extent, sign: -1, color: color ?? MINUS, pattern: true, isoKey },
    ]

    switch (view.kind) {
      case 'orbital': {
        const o = ORBITALS[view.id]
        return both(view.id, o.fn, o.extent)
      }
      case 'set':
        return view.ids.flatMap((id, i) => both(id, ORBITALS[id].fn, ORBITALS[id].extent, SET_COLORS[i % SET_COLORS.length]))
      case 'bond': {
        const b = BONDS[view.id]
        return both(view.id, b.fn, b.extent)
      }
      case 'hybrids': {
        const set = HYBRID_SETS[view.set]
        const isoKey = `${view.set}-iso`
        const hybrids: Piece[] =
          view.only !== undefined
            ? // One hybrid, both phases: shows the big front lobe and the small back lobe.
              both(`${view.set}-${view.only}`, hybrid(set.k, set.dirs[view.only]), 14, undefined, isoKey)
            : // All hybrids: just their big (+) lobes, each in its own color, for clarity.
              set.dirs.map((d, i) => ({
                key: `${view.set}-${i}`,
                fn: hybrid(set.k, d),
                extent: 14,
                sign: 1 as const,
                color: SET_COLORS[i],
                pattern: false,
                isoKey,
              }))
        const leftover = view.leftover
          ? set.leftover.flatMap((id) =>
              // Leftover p orbitals: faint and without the mesh pattern, so the hybrids stay readable.
              both(id, ORBITALS[id].fn, ORBITALS[id].extent).map((p) => ({ ...p, color: p.sign > 0 ? '#9aa3c4' : '#6a7090', opacity: 0.28, pattern: false })),
            )
          : []
        return [...hybrids, ...leftover]
      }
    }
  }

  private setNuclei(view: OrbitalView) {
    this.nuclei.clear()
    const positions: [number, number, number][] = view.kind === 'bond' ? BONDS[view.id].nuclei : [[0, 0, 0]]
    const mat = new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#ffffff', emissiveIntensity: 0.4 })
    for (const [x, y, z] of positions) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.09, 20, 14), mat)
      m.position.set(x * BOHR, z * BOHR, -y * BOHR) // same chemistry→screen rotation as the surfaces
      this.nuclei.add(m)
    }
  }

  /* ----------------------------------------------------------- building surfaces */

  private geoKey(p: Piece) {
    return `${p.key}:${p.sign}`
  }

  private geometryFor(p: Piece) {
    const key = this.geoKey(p)
    let geo = this.cache.get(key)
    if (geo) return geo
    // Sample once; reuse the same samples for the 90% threshold (computed once per function,
    // shared by both phases) and for building the surface.
    const values = sampleGrid(p.fn, this.n, p.extent)
    let iso = this.isoCache.get(p.isoKey)
    if (iso === undefined) {
      iso = isoForFraction(values, 0.9)
      this.isoCache.set(p.isoKey, iso)
    }
    if (p.sign < 0) for (let i = 0; i < values.length; i++) values[i] = -values[i]
    this.gen.field.set(values)
    this.gen.isolation = iso
    this.gen.update()
    // Copy just the used part of the generator's big buffers into a compact geometry.
    const count = this.gen.count
    const raw = new THREE.BufferGeometry()
    raw.setAttribute('position', new THREE.BufferAttribute(this.gen.positionArray.slice(0, count * 3), 3))
    // Marching cubes leaves every triangle separate, which shades as patchy facets. Joining
    // shared corners and recomputing normals gives a smooth surface (and fewer vertices).
    geo = mergeVertices(raw, 1e-5)
    geo.computeVertexNormals()
    raw.dispose()
    geo.scale(p.extent * BOHR, p.extent * BOHR, p.extent * BOHR) // grid units → ångströms
    geo.rotateX(-Math.PI / 2) // chemistry z → screen up
    geo.computeBoundingSphere()
    this.cache.set(key, geo)
    return geo
  }

  private meshFor(p: Piece): THREE.Object3D[] {
    const geo = this.geometryFor(p)
    const clipping = this.cutaway ? [this.clip] : []
    const opacity = p.opacity ?? 1
    const surface = new THREE.Mesh(
      geo,
      glossy({
        color: p.color,
        roughness: 0.35,
        clearcoat: 0.3,
        clippingPlanes: clipping,
        transparent: opacity < 1,
        opacity,
        depthWrite: opacity >= 1,
      }),
    )
    const out: THREE.Object3D[] = [surface]
    // In a cutaway, the inside of each cut shell is drawn darker, so the cut edge reads clearly.
    if (this.cutaway) {
      const inside = new THREE.Color(p.color).multiplyScalar(0.45)
      out.push(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: inside, roughness: 0.8, side: THREE.BackSide, clippingPlanes: clipping })))
    }
    if (!p.pattern) return out
    // The − phase also gets a fine mesh pattern (so phase isn't shown by color alone).
    const pattern = new THREE.Mesh(
      geo,
      new THREE.MeshBasicMaterial({ color: '#2a1606', wireframe: true, transparent: true, opacity: 0.35 * opacity, clippingPlanes: clipping }),
    )
    return [...out, pattern]
  }
}

/* ---------- helpers ---------- */

const nextFrame = () => new Promise<void>((r) => requestAnimationFrame(() => r()))

/** Thin x, y, z axis lines (unit length; scaled to fit each view). */
function makeAxes() {
  const g = new THREE.Group()
  const mat = new THREE.LineDashedMaterial({ color: '#7e84a6', dashSize: 0.04, gapSize: 0.03, transparent: true, opacity: 0.7 })
  const line = (a: THREE.Vector3, b: THREE.Vector3) => {
    const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints([a, b]), mat)
    l.computeLineDistances()
    return l
  }
  g.add(line(new THREE.Vector3(-1, 0, 0), new THREE.Vector3(1, 0, 0))) // x
  g.add(line(new THREE.Vector3(0, -1, 0), new THREE.Vector3(0, 1, 0))) // chemistry z (screen up)
  g.add(line(new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, 0, 1))) // chemistry y (into the screen)
  return g
}
