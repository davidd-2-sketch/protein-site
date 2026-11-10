/*
  VseprScene.ts — the 3D VSEPR view.

  It shows a central atom with up to six electron groups around it:
    • bonded atoms (spheres + bonds; double bonds drawn as two sticks),
    • lone pairs (soft gold "clouds"),
    • angle arcs between chosen bonds,
    • optionally, the faint outline of the ELECTRON geometry (e.g. a tetrahedron).

  When the arrangement changes, every group glides from its old direction to its new one
  (spherical interpolation, ~0.7 s), so students see the groups push each other apart.
  Uses Stage3D, so it only redraws while something is moving.
*/
import * as THREE from 'three'
import { Stage3D } from '../three/Stage3D'
import { elementStyle } from '../three/elements'
import type { Domain } from './shapes'

const MAX = 6
const LONE_COLOR = '#ffc94d'
const ANIM_SECONDS = 0.7
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

export interface SceneState {
  central: string
  ligand: string
  order: number
  domains: Domain[]
  /** [bond index, bond index, label] */
  arcs: [number, number, string][]
  /** Directions to outline when no groups are drawn (a "mystery" step's empty electron geometry). */
  hullDirs?: [number, number, number][]
}

export interface SceneLabels {
  atoms: { text: string; position: THREE.Vector3 }[]
  arcs: { text: string; position: THREE.Vector3 }[]
}

/** One electron group slot that can be a bond or a lone pair, and can animate. */
interface Slot {
  from: THREE.Vector3
  to: THREE.Vector3
  dir: THREE.Vector3
  kind: 'bond' | 'lone' | 'none'
  prevKind: 'bond' | 'lone' | 'none'
  atom: THREE.Mesh
  bondA: THREE.Mesh
  bondB: THREE.Mesh // second stick for double bonds
  lobe: THREE.Mesh
}

export class VseprScene {
  readonly stage: Stage3D
  private slots: Slot[] = []
  private central: THREE.Mesh
  private arcLines: THREE.Line[] = []
  private hull: THREE.LineSegments
  private materials = new Map<string, THREE.MeshPhysicalMaterial>()
  private bondMaterial = new THREE.MeshPhysicalMaterial({ color: '#c8cde6', roughness: 0.35, clearcoat: 0.4 })
  // Lone-pair "cloud": mostly self-lit (emissive) so it glows gold instead of looking
  // muddy where it's translucent over the dark background.
  // Lone-pair "cloud": a tiny custom shader. It's brightest where the cloud faces you and
  // fades to nothing at its edges (like real fuzzy electron density), and it ADDS light
  // (additive blending), so it glows gold instead of looking like muddy brown glass.
  private lobeMaterial = new THREE.ShaderMaterial({
    uniforms: { color: { value: new THREE.Color(LONE_COLOR) } },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vView;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vNormal = normalize(normalMatrix * normal);
        vView = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform vec3 color;
      varying vec3 vNormal;
      varying vec3 vView;
      void main() {
        float facing = clamp(dot(normalize(vNormal), normalize(vView)), 0.0, 1.0);
        float glow = pow(facing, 1.6);           // bright center, soft edge
        gl_FragColor = vec4(color * (0.25 + 0.95 * glow), glow * 0.9);
      }`,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  })
  private arcMaterial = new THREE.LineBasicMaterial({ color: '#5ee4ff', transparent: true, opacity: 0.9 })
  private state: SceneState | null = null
  private t = 1 // animation progress 0 → 1
  private bondLength = 1.6
  private showHull = false
  private showArcs = true
  private labels: SceneLabels = { atoms: [], arcs: [] }

  constructor(container: HTMLElement) {
    this.stage = new Stage3D(container, 'vsepr')
    const sphere = new THREE.SphereGeometry(1, 48, 32)
    const cylinder = new THREE.CylinderGeometry(1, 1, 1, 24, 1, true)
    // A lone pair is drawn as a stretched, translucent sphere (an electron "cloud").
    const lobeGeo = new THREE.SphereGeometry(1, 32, 24)

    this.central = new THREE.Mesh(sphere, this.material('A'))
    this.stage.scene.add(this.central)

    for (let i = 0; i < MAX; i++) {
      const slot: Slot = {
        from: new THREE.Vector3(1, 0, 0),
        to: new THREE.Vector3(1, 0, 0),
        dir: new THREE.Vector3(1, 0, 0),
        kind: 'none',
        prevKind: 'none',
        atom: new THREE.Mesh(sphere, this.material('X')),
        bondA: new THREE.Mesh(cylinder, this.bondMaterial),
        bondB: new THREE.Mesh(cylinder, this.bondMaterial),
        lobe: new THREE.Mesh(lobeGeo, this.lobeMaterial),
      }
      slot.lobe.renderOrder = 2 // draw clouds after solid atoms so they blend correctly
      this.stage.scene.add(slot.atom, slot.bondA, slot.bondB, slot.lobe)
      this.slots.push(slot)
    }

    this.hull = new THREE.LineSegments(
      new THREE.BufferGeometry(),
      new THREE.LineDashedMaterial({ color: '#a9aecb', dashSize: 0.12, gapSize: 0.1, transparent: true, opacity: 0.55 }),
    )
    this.stage.scene.add(this.hull)

    this.stage.onBeforeRender((dt) => this.tick(dt))
    this.stage.fit(3.2, true)
  }

  /** Show a new arrangement. Groups glide from where they are now. */
  setState(next: SceneState) {
    const prev = this.state
    this.state = next
    this.central.material = this.material(next.central)
    this.central.scale.setScalar(this.radius(next.central))
    this.bondLength = this.radius(next.central) + this.radius(next.ligand) + 0.9
    this.slots.forEach((s) => (s.atom.material = this.material(next.ligand)))

    // Match each new group to the closest existing one, so motion is as small as possible.
    const targets = next.domains.map((d) => new THREE.Vector3(...d.dir).normalize())
    const free = new Set(this.slots.map((_, i) => i))
    const assignment: number[] = []
    targets.forEach((target, k) => {
      let best = -1
      let bestDot = -Infinity
      for (const i of free) {
        const s = this.slots[i]
        if (s.kind === 'none') continue
        const sameKind = s.kind === next.domains[k].kind ? 0.5 : 0 // prefer keeping bonds as bonds
        const score = s.dir.dot(target) + sameKind
        if (score > bestDot) {
          bestDot = score
          best = i
        }
      }
      if (best === -1) best = [...free][0] // a brand-new group: take an empty slot
      free.delete(best)
      assignment[k] = best
    })

    this.slots.forEach((s) => {
      s.prevKind = s.kind
      s.from.copy(s.dir)
    })
    targets.forEach((target, k) => {
      const s = this.slots[assignment[k]]
      if (s.kind === 'none') {
        // New group: grow outward from roughly where it will end up.
        s.from.copy(target)
        s.dir.copy(target)
      }
      s.to.copy(target)
      s.kind = next.domains[k].kind
    })
    for (const i of free) {
      this.slots[i].to.copy(this.slots[i].dir)
      this.slots[i].kind = 'none'
    }

    // Remember which slot is "bond #i" so angle arcs can find them.
    this.bondSlots = next.domains.map((d, k) => (d.kind === 'bond' ? assignment[k] : -1)).filter((i) => i >= 0)
    this.t = prev ? 0 : 1
    this.layout()
    this.stage.requestRender()
  }

  setOptions(o: { hull?: boolean; arcs?: boolean }) {
    if (o.hull !== undefined) this.showHull = o.hull
    if (o.arcs !== undefined) this.showArcs = o.arcs
    this.layout()
    this.stage.requestRender()
  }

  /** Current 3D label positions (atom symbols and angle values), for the HTML overlay. */
  getLabels() {
    return this.labels
  }

  dispose() {
    this.materials.forEach((m) => m.dispose())
    this.bondMaterial.dispose()
    this.lobeMaterial.dispose()
    this.arcMaterial.dispose()
    this.stage.dispose()
  }

  /* ----------------------------------------------------------- internals */

  private bondSlots: number[] = []

  private radius(el: string) {
    return 0.22 + 0.25 * elementStyle(el).covalentRadius
  }

  private material(el: string) {
    let m = this.materials.get(el)
    if (!m) {
      m = new THREE.MeshPhysicalMaterial({ color: elementStyle(el).color, roughness: 0.32, clearcoat: 0.55, clearcoatRoughness: 0.18 })
      this.materials.set(el, m)
    }
    return m
  }

  /** Advance the glide animation. Returns true while still moving (so the stage keeps drawing). */
  private tick(dt: number) {
    if (this.t >= 1) return false
    this.t = Math.min(1, this.t + dt / ANIM_SECONDS)
    this.layout()
    return true
  }

  /** Place every object for the current animation progress. */
  private layout() {
    if (!this.state) return
    const e = ease(this.t)
    const { order, ligand } = this.state
    const L = this.bondLength
    const rLig = this.radius(ligand)
    const atomLabels: SceneLabels['atoms'] = [{ text: this.state.central, position: new THREE.Vector3() }]

    this.slots.forEach((s) => {
      // Spherical interpolation keeps the group at a constant distance while it swings around.
      s.dir.copy(slerp(s.from, s.to, e))
      // Grow in / shrink out when a group appears, disappears, or changes kind.
      const appear = (k: Slot['kind']) => (s.kind === k ? (s.prevKind === k ? 1 : e) : s.prevKind === k ? 1 - e : 0)
      const bondScale = appear('bond')
      const loneScale = appear('lone')

      const tip = s.dir.clone().multiplyScalar(L)
      s.atom.visible = bondScale > 0.01
      s.atom.position.copy(tip)
      s.atom.scale.setScalar(rLig * bondScale)

      // Bond sticks: one for single, two side by side for double.
      const side = perpendicular(s.dir).multiplyScalar(0.07)
      const thick = order >= 2 ? 0.055 : 0.085
      s.bondA.visible = bondScale > 0.01
      s.bondB.visible = bondScale > 0.01 && order >= 2
      const end = s.dir.clone().multiplyScalar(L * bondScale)
      placeCylinder(s.bondA, order >= 2 ? side : new THREE.Vector3(), order >= 2 ? end.clone().add(side) : end, thick)
      if (order >= 2) placeCylinder(s.bondB, side.clone().negate(), end.clone().sub(side), thick)

      // Lone pair cloud: a teardrop-ish ellipsoid pointing outward.
      s.lobe.visible = loneScale > 0.01
      s.lobe.position.copy(s.dir.clone().multiplyScalar(0.95 * loneScale))
      s.lobe.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), s.dir)
      s.lobe.scale.set(0.5 * loneScale, 0.85 * loneScale, 0.5 * loneScale)

      if (s.kind === 'bond' && bondScale > 0.5) atomLabels.push({ text: ligand, position: tip.clone() })
    })

    this.layoutArcs(e)
    this.layoutHull()
    this.labels.atoms = atomLabels
  }

  /** Angle arcs between chosen bonds, plus the positions for their text labels. */
  private layoutArcs(e: number) {
    this.arcLines.forEach((l) => {
      l.geometry.dispose()
      this.stage.scene.remove(l)
    })
    this.arcLines = []
    this.labels.arcs = []
    if (!this.showArcs || !this.state || e < 1) return // show arcs once the shape has settled
    const r = this.bondLength * 0.45
    for (const [i, j, text] of this.state.arcs) {
      const a = this.slots[this.bondSlots[i]]?.dir
      const b = this.slots[this.bondSlots[j]]?.dir
      if (!a || !b) continue
      const pts: THREE.Vector3[] = []
      // For a straight (180°) angle, bend the arc toward the viewer-ish side so it's visible.
      const helper = a.dot(b) < -0.999 ? perpendicular(a) : null
      for (let k = 0; k <= 32; k++) {
        const t = k / 32
        const p = helper ? a.clone().applyAxisAngle(a.clone().cross(helper).normalize(), Math.PI * t) : slerp(a, b, t)
        pts.push(p.multiplyScalar(r))
      }
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), this.arcMaterial)
      this.stage.scene.add(line)
      this.arcLines.push(line)
      // Wide angles (over 150°) put their label a third of the way along the arc, so it can't
      // land on top of another angle's label near the middle.
      const wide = a.angleTo(b) > (150 * Math.PI) / 180
      this.labels.arcs.push({ text, position: pts[wide ? 10 : 16].clone().multiplyScalar(1.45) })
    }
  }

  /** The faint electron-geometry outline: connect neighboring group tips (not opposite ones). */
  private layoutHull() {
    const geo = this.hull.geometry
    this.hull.visible = this.showHull
    if (!this.showHull) return
    const shown = this.slots.filter((s) => s.kind !== 'none').map((s) => s.dir)
    const dirs = shown.length ? shown : (this.state?.hullDirs ?? []).map((d) => new THREE.Vector3(...d))
    const tips = dirs.map((d) => d.clone().multiplyScalar(this.bondLength))
    const pts: THREE.Vector3[] = []
    for (let i = 0; i < tips.length; i++)
      for (let j = i + 1; j < tips.length; j++) {
        const angle = tips[i].angleTo(tips[j]) * (180 / Math.PI)
        if (angle < 125) pts.push(tips[i], tips[j]) // neighbors only, skip straight-across pairs
      }
    geo.setFromPoints(pts)
    this.hull.computeLineDistances()
  }
}

/* ---------- small math helpers ---------- */

function slerp(a: THREE.Vector3, b: THREE.Vector3, t: number) {
  const dot = THREE.MathUtils.clamp(a.dot(b), -1, 1)
  if (dot > 0.9995) return a.clone().lerp(b, t).normalize()
  if (dot < -0.9995) {
    // Opposite directions: rotate through a perpendicular so the path is well defined.
    return a.clone().applyAxisAngle(perpendicular(a), Math.PI * t)
  }
  const theta = Math.acos(dot) * t
  const rel = b.clone().sub(a.clone().multiplyScalar(dot)).normalize()
  return a.clone().multiplyScalar(Math.cos(theta)).add(rel.multiplyScalar(Math.sin(theta)))
}

function perpendicular(v: THREE.Vector3) {
  const ref = Math.abs(v.z) < 0.9 ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(1, 0, 0)
  return v.clone().cross(ref).normalize()
}

function placeCylinder(mesh: THREE.Mesh, a: THREE.Vector3, b: THREE.Vector3, r: number) {
  const dir = b.clone().sub(a)
  const len = Math.max(dir.length(), 1e-4)
  mesh.scale.set(r, len, r)
  mesh.position.copy(a).addScaledVector(dir, 0.5)
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize())
}
