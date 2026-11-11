/*
  PolarityScene.ts — 3D view of a molecule with its bond dipoles.

  Two states, animated between with setSum(on):
    • apart (t = 0): each bond dipole arrow sits beside its bond, pointing toward the
      more electronegative atom, with a "+" cross on its tail (chemistry convention).
    • summed (t = 1): the same arrows slide tip-to-tail starting at the central atom.
      That IS vector addition: if the chain ends where it started, the dipoles cancel
      (nonpolar). Otherwise a pink net-dipole arrow appears from start to end (polar).

  Arrows draw on top of atoms (no depth test) so they are never hidden.
  Built on Stage3D: renders only when something changes.
*/
import * as THREE from 'three'
import { Stage3D } from '../three/Stage3D'
import { elementStyle } from '../three/elements'
import { glossy, sphereGeometry } from '../three/quality3d'
import { bondDipoles, displayScale, netDipole, partialCharges, type PolarMolecule, type Vec } from './molecules'

const BOND_ARROW = '#5ee4ff'
const NET_ARROW = '#ff7ad9'
const LONE_PAIR = '#ffc94d'
const V = (p: Vec) => new THREE.Vector3(p[0], p[1], p[2])
const ease = (t: number) => t * t * (3 - 2 * t)

export interface PolarityLabel {
  text: string
  pos: THREE.Vector3
  kind: 'atom' | 'charge' | 'net'
}

/** A direction perpendicular to `dir`, preferring "up" (then "toward the viewer"). */
function perpendicular(dir: THREE.Vector3) {
  const side = new THREE.Vector3(0, 1, 0.25)
  side.addScaledVector(dir, -side.dot(dir))
  if (side.lengthSq() < 1e-6) side.set(0, 0, 1).addScaledVector(dir, -dir.z)
  return side.normalize()
}

/**
 * Where the arrows go when summed: a chain, tip to tail, in a clear spot to the right of
 * the molecule (so it never overlaps atoms or bonds). Also the centre and size of
 * everything, for framing the camera. Pure: depends only on the molecule.
 */
export function sumLayout(m: PolarMolecule) {
  const k = displayScale(m)
  const vecs = bondDipoles(m, k).map((b) => V(b.vector))
  // Chain order: the arrow most aligned with the net dipole goes last, so the net arrow
  // cuts across an open path instead of lying on top of an arrow.
  const net0 = V(netDipole(m, k))
  const order = vecs.map((_, i) => i)
  if (net0.length() > 1e-6) order.sort((a, b) => vecs[a].clone().normalize().dot(net0) - vecs[b].clone().normalize().dot(net0))
  const rel: THREE.Vector3[] = new Array(vecs.length)
  const p = new THREE.Vector3()
  order.forEach((i, n) => {
    const v = vecs[i]
    const start = p.clone()
    // An arrow pointing straight back along the previous one (CO₂) would hide it: nudge it aside.
    if (n > 0 && vecs[order[n - 1]].clone().normalize().dot(v.clone().normalize()) < -0.99) start.addScaledVector(perpendicular(v), 0.22)
    rel[i] = start
    p.add(v)
  })
  const chainPts = rel.flatMap((s, k) => [s, s.clone().add(vecs[k])])
  const box = new THREE.Box3().setFromPoints(chainPts)
  const molBox = new THREE.Box3().setFromPoints(m.atoms.map((a) => V(a.pos)))
  const origin = new THREE.Vector3(molBox.max.x + 1.2 - box.min.x, -(box.min.y + box.max.y) / 2, 0)
  const starts = rel.map((s) => s.clone().add(origin))
  const all = new THREE.Box3().setFromPoints([...m.atoms.map((a) => V(a.pos)), ...chainPts.map((q) => q.clone().add(origin))])
  const center = all.getCenter(new THREE.Vector3())
  const radius = Math.max(...[...m.atoms.map((a) => V(a.pos)), ...chainPts.map((q) => q.clone().add(origin))].map((q) => q.distanceTo(center))) + 0.8
  return { origin, starts, vecs, net: net0, chainBottom: box.min.y + origin.y, center, radius }
}

/** Labels for the HTML overlay (positions in molecule coordinates): symbols, δ+/δ−, net dipole. */
export function polarityLabels(m: PolarMolecule): PolarityLabel[] {
  const charges = partialCharges(m)
  const labels: PolarityLabel[] = []
  const c = V(m.atoms[m.center].pos)
  m.atoms.forEach((a, i) => {
    labels.push({ text: a.el, pos: V(a.pos), kind: 'atom' })
    const q = charges[i]
    if (!q) return
    // Just outside the atom, away from the centre (or below, for the central atom).
    const out = V(a.pos).sub(c)
    const dir = out.lengthSq() > 1e-6 ? out.normalize() : new THREE.Vector3(0, -1, 0)
    labels.push({ text: `δ${q}`, pos: V(a.pos).addScaledVector(dir, 0.42).add(new THREE.Vector3(0, 0.22, 0)), kind: 'charge' })
  })
  const L = sumLayout(m)
  labels.push({
    text: m.dipole === 0 ? 'Sum = 0: nonpolar' : `Net dipole: ${m.dipole.toFixed(2)} D (measured)`,
    // Below the summed arrows, so it never covers them.
    pos: new THREE.Vector3(L.origin.x + L.net.x / 2, L.chainBottom - 0.45, 0),
    kind: 'net',
  })
  return labels
}

/** An arrow (shaft + cone head) with an optional "+" cross bar near its tail. */
class Arrow {
  group = new THREE.Group()
  private shaft: THREE.Mesh
  private head: THREE.Mesh
  private bar: THREE.Mesh | null
  constructor(material: THREE.Material, radius: number, cross: boolean) {
    const cyl = new THREE.CylinderGeometry(radius, radius, 1, 12)
    this.shaft = new THREE.Mesh(cyl, material)
    this.head = new THREE.Mesh(new THREE.ConeGeometry(radius * 2.7, radius * 6.5, 20), material)
    this.bar = cross ? new THREE.Mesh(cyl, material) : null
    for (const m of [this.shaft, this.head, this.bar]) {
      if (!m) continue
      m.renderOrder = 10
      this.group.add(m)
    }
  }

  /** Place from `start` along `vec`; `side` is the direction the "+" bar extends. */
  set(start: THREE.Vector3, vec: THREE.Vector3, side: THREE.Vector3, opacity = 1) {
    // (Opacity is set on the shared material by the caller; here it only hides near-invisible arrows.)
    const len = vec.length()
    this.group.visible = len > 1e-6 && opacity > 0.01
    if (!this.group.visible) return
    const dir = vec.clone().normalize()
    const headLen = (this.head.geometry as THREE.ConeGeometry).parameters.height
    const shaftLen = Math.max(0.02, len - headLen)
    const up = new THREE.Vector3(0, 1, 0)
    this.shaft.scale.set(1, shaftLen, 1)
    this.shaft.position.copy(start).addScaledVector(dir, shaftLen / 2)
    this.shaft.quaternion.setFromUnitVectors(up, dir)
    this.head.position.copy(start).addScaledVector(dir, shaftLen + headLen / 2)
    this.head.quaternion.setFromUnitVectors(up, dir)
    if (this.bar) {
      this.bar.scale.set(1, 0.24, 1)
      this.bar.position.copy(start).addScaledVector(dir, Math.min(0.12, len * 0.2))
      this.bar.quaternion.setFromUnitVectors(up, side)
    }
  }
}

export class PolarityScene {
  readonly stage: Stage3D
  private root = new THREE.Group()
  private layout: ReturnType<typeof sumLayout> | null = null
  private view: Vec | undefined
  private arrows: { arrow: Arrow; vec: THREE.Vector3; besideStart: THREE.Vector3; side: THREE.Vector3 }[] = []
  private net: Arrow | null = null
  private lonePairs = new THREE.Group()
  private materials: THREE.Material[] = []
  private t = 0
  private showLonePairs = true
  private target = 0
  private bondMat: THREE.MeshStandardMaterial
  private netMat: THREE.MeshStandardMaterial

  constructor(container: HTMLElement) {
    this.stage = new Stage3D(container, 'polarity')
    this.stage.scene.add(this.root)
    const glow = (color: string, opacity: number) =>
      new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.7, roughness: 0.4, transparent: true, opacity, depthTest: false })
    this.bondMat = glow(BOND_ARROW, 0.95)
    this.netMat = glow(NET_ARROW, 1)
    this.materials.push(this.bondMat, this.netMat)

    // Animate t toward the target (about 1.4 s for the full slide).
    this.stage.onBeforeRender((dt) => {
      if (this.t === this.target) return false
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      const step = reduced ? 1 : dt / 1.4
      this.t = this.target > this.t ? Math.min(this.target, this.t + step) : Math.max(this.target, this.t - step)
      this.placeArrows()
      return true
    })
  }

  setMolecule(m: PolarMolecule) {
    this.clear()
    const sphere = sphereGeometry(1, 0.85)
    const cyl = new THREE.CylinderGeometry(1, 1, 1, 20)
    const up = new THREE.Vector3(0, 1, 0)

    // Atoms (smallish balls, so arrows beside the bonds stay visible).
    for (const a of m.atoms) {
      const mat = glossy({ color: elementStyle(a.el).color, roughness: 0.32, clearcoat: 0.55, clearcoatRoughness: 0.18 })
      this.materials.push(mat)
      const mesh = new THREE.Mesh(sphere, mat)
      mesh.scale.setScalar(0.16 + 0.17 * elementStyle(a.el).covalentRadius)
      mesh.position.copy(V(a.pos))
      this.root.add(mesh)
    }

    // Bonds (double bonds as two thinner sticks).
    const bondMat = glossy({ color: '#c8cde6', roughness: 0.35, clearcoat: 0.4 })
    this.materials.push(bondMat)
    for (const [i, j, order] of m.bonds) {
      const a = V(m.atoms[i].pos)
      const b = V(m.atoms[j].pos)
      const dir = b.clone().sub(a)
      const perp = new THREE.Vector3(0, 1, 0).cross(dir).lengthSq() > 1e-6 ? new THREE.Vector3(0, 0, 1).cross(dir).normalize() : new THREE.Vector3(1, 0, 0)
      const offsets = order === 2 ? [-0.07, 0.07] : [0]
      for (const o of offsets) {
        const mesh = new THREE.Mesh(cyl, bondMat)
        mesh.scale.set(order === 2 ? 0.05 : 0.07, dir.length(), order === 2 ? 0.05 : 0.07)
        mesh.position.copy(a).addScaledVector(dir, 0.5).addScaledVector(perp, o)
        mesh.quaternion.setFromUnitVectors(up, dir.clone().normalize())
        this.root.add(mesh)
      }
    }

    // Lone pairs on the central atom: two small gold dots each.
    const lpMat = new THREE.MeshStandardMaterial({ color: LONE_PAIR, emissive: LONE_PAIR, emissiveIntensity: 0.8 })
    this.materials.push(lpMat)
    const dot = new THREE.SphereGeometry(0.06, 14, 10)
    const c = V(m.atoms[m.center].pos)
    for (const d of m.lonePairs) {
      const dir = V(d).normalize()
      const side = new THREE.Vector3(1, 0, 0).cross(dir)
      if (side.lengthSq() < 1e-6) side.set(0, 0, 1)
      side.normalize()
      for (const s of [-1, 1]) {
        const e = new THREE.Mesh(dot, lpMat)
        e.position.copy(c).addScaledVector(dir, 0.62).addScaledVector(side, 0.09 * s)
        this.lonePairs.add(e)
      }
    }
    this.lonePairs.visible = this.showLonePairs
    this.root.add(this.lonePairs)

    // Bond dipole arrows: beside each bond, on the side away from the rest of the molecule.
    for (const b of bondDipoles(m, displayScale(m))) {
      const vec = V(b.vector)
      const from = V(m.atoms[b.from].pos)
      const to = V(m.atoms[b.to].pos)
      const mid = from.clone().lerp(to, 0.5)
      const dir = vec.clone().normalize()
      const others = m.atoms.filter((_, k) => k !== b.from && k !== b.to)
      const centroid = others.reduce((s, a) => s.add(V(a.pos)), new THREE.Vector3()).multiplyScalar(1 / Math.max(1, others.length))
      let side = mid.clone().sub(centroid)
      side.addScaledVector(dir, -side.dot(dir))
      if (!others.length || side.length() < 0.05) {
        side = new THREE.Vector3(0, 1, 0.25)
        side.addScaledVector(dir, -side.dot(dir))
      }
      side.normalize()
      const besideStart = mid.clone().addScaledVector(side, 0.34).addScaledVector(dir, -vec.length() / 2)
      const arrow = new Arrow(this.bondMat, 0.035, true)
      this.root.add(arrow.group)
      this.arrows.push({ arrow, vec, besideStart, side })
    }

    // Net dipole arrow (only drawn when it isn't zero).
    this.net = new Arrow(this.netMat, 0.055, true)
    this.root.add(this.net.group)

    this.layout = sumLayout(m)
    this.view = m.view
    // Centre the molecule + summed chain on screen.
    this.root.position.copy(this.layout.center).multiplyScalar(-1)
    this.resetView()
    this.t = this.target
    this.placeArrows()
  }

  /** Slide the arrows tip-to-tail (true) or back beside their bonds (false). */
  setSum(on: boolean, instant = false) {
    this.target = on ? 1 : 0
    if (instant) {
      this.t = this.target
      this.placeArrows()
    }
    this.stage.requestRender()
  }

  setOptions(o: { lonePairs?: boolean }) {
    if (o.lonePairs !== undefined) this.lonePairs.visible = this.showLonePairs = o.lonePairs
    this.stage.requestRender()
  }

  private placeArrows() {
    const L = this.layout
    if (!L) return
    const t = ease(this.t)
    this.arrows.forEach((a, k) => a.arrow.set(a.besideStart.clone().lerp(L.starts[k], t), a.vec, a.side))
    // The net arrow fades in once the chain is complete (polar molecules only).
    const show = L.net.length() > 1e-6 ? Math.max(0, (this.t - 0.85) / 0.15) : 0
    this.netMat.opacity = show
    this.net?.set(L.origin, L.net, perpendicular(L.net.clone().normalize()), show)
    this.stage.requestRender()
  }

  /** Frame the molecule and the summed chain. */
  resetView() {
    if (!this.layout) return
    const dir = this.view ? V(this.view) : new THREE.Vector3(0.35, 0.3, 1)
    this.stage.lookFrom(dir, Math.max(this.layout.radius, 1.9))
  }

  /** Molecule coordinates → world coordinates (the molecule is shifted to centre the view). */
  toWorld(p: THREE.Vector3) {
    return p.clone().add(this.root.position)
  }

  /** 0 = arrows beside bonds, 1 = summed. */
  get progress() {
    return this.t
  }

  private clear() {
    this.root.traverse((o) => {
      if (o instanceof THREE.Mesh) o.geometry.dispose()
    })
    this.root.clear()
    this.lonePairs = new THREE.Group()
    this.arrows = []
    this.net = null
    this.materials.splice(2).forEach((m) => m.dispose())
  }

  dispose() {
    this.clear()
    this.materials.forEach((m) => m.dispose())
    this.stage.dispose()
  }
}
