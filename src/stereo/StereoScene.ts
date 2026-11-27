/*
  StereoScene.ts — the 3D view for the Stereochemistry page.

  It shows one molecule (ball and stick) and can, with smooth animations:
    • turn the molecule so a stereocenter's lowest-priority group points away from you
      (or toward you, for the "reverse it" trap), and draw the 1 → 2 → 3 arrow;
    • stand it upright the Fischer way (chain going back, side groups coming forward);
    • show its MIRROR IMAGE beside it, behind a glass mirror, then slide the mirror image
      on top to "try to superimpose" the two (they never match for a chiral molecule);
    • SWAP two groups on a stereocenter (which turns R into S);
    • turn one bond until two groups line up (eclipsed), revealing meso's mirror plane;
    • show a second molecule beside it, for comparisons (e.g. diastereomers).

  Everything is declarative: the page calls setView() with what should be shown, and the
  scene animates from wherever it is. Built on Stage3D, so it only draws while something moves.
*/
import * as THREE from 'three'
import { Stage3D } from '../three/Stage3D'
import { elementStyle } from '../three/elements'
import { glossy, sphereGeometry, type GlossyMaterial } from '../three/quality3d'
import { descriptor, neighborsOf, priorities, stereocenters } from './cip'
import type { SMolecule, Vec3 } from './smiles'

const V = (p: Vec3) => new THREE.Vector3(p[0], p[1], p[2])
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
const ACCENT = '#6fe3ff'
const ARROW = '#ffd27a'
const radiusOf = (el: string) => 0.15 + 0.19 * elementStyle(el).covalentRadius

export interface StereoView {
  model: SMolecule
  /** The stereocenter in focus (atom index). */
  center?: number
  /** free: a tilted 3D view. lowest-away / lowest-toward: for reading R/S. fischer: chain back, sides forward. */
  orient?: 'free' | 'lowest-away' | 'lowest-toward' | 'fischer'
  /** For orient 'fischer': the chain neighbors of the center, [up, down]. */
  fischerAxis?: [number, number]
  /** Show the 1 → 2 → 3 arrow around the focused center. */
  arrow?: boolean
  /** Mirror image: beside (with a glass mirror) or slid on top. */
  mirror?: 'beside' | 'overlay' | null
  /** For the overlay: two groups (neighbor atoms of the center) to line up first. */
  align?: [number, number]
  /** Swap these two groups (neighbors of the center). */
  swap?: [number, number] | null
  /** Turn the bond b–c until a–b–c–d is eclipsed (0°). */
  eclipse?: [number, number, number, number] | null
  /** Show a mirror plane through the middle of bond [b, c] (for meso). */
  plane?: boolean
  /** A second molecule, shown beside the first (same orientation). */
  compare?: SMolecule | null
}

export interface StereoLabel {
  key: string
  text: string
  kind: 'priority' | 'element' | 'rs' | 'mismatch' | 'caption'
  pos: THREE.Vector3
  /** Priority 1–4 (for styling). */
  rank?: number
}

/* ------------------------------------------------------------------ one molecule's meshes */
class MolMeshes {
  group = new THREE.Group()
  atoms: THREE.Mesh[] = []
  bonds: { mesh: THREE.Mesh; a: number; b: number; offset: number; order: number }[] = []
  private bondMat: GlossyMaterial
  model: SMolecule
  constructor(
    model: SMolecule,
    mats: (el: string) => GlossyMaterial,
    bondMat: GlossyMaterial,
    sphere: THREE.BufferGeometry,
    cyl: THREE.BufferGeometry,
  ) {
    this.bondMat = bondMat
    this.model = model
    model.atoms.forEach((a) => {
      const m = new THREE.Mesh(sphere, mats(a.el))
      m.scale.setScalar(radiusOf(a.el))
      this.atoms.push(m)
      this.group.add(m)
    })
    for (const [a, b, order] of model.bonds) {
      const offsets = order === 2 ? [-0.075, 0.075] : [0]
      for (const o of offsets) {
        const mesh = new THREE.Mesh(cyl, this.bondMat)
        this.bonds.push({ mesh, a, b, offset: o, order })
        this.group.add(mesh)
      }
    }
  }

  /** Move every atom and bond to these positions (model coordinates). */
  place(pos: THREE.Vector3[]) {
    const up = new THREE.Vector3(0, 1, 0)
    this.atoms.forEach((m, i) => m.position.copy(pos[i]))
    for (const b of this.bonds) {
      const a = pos[b.a]
      const c = pos[b.b]
      const dir = c.clone().sub(a)
      const len = dir.length()
      dir.normalize()
      let side = new THREE.Vector3()
      if (b.offset) {
        // Double bonds: offset in the plane of a neighbor, so both sticks are visible.
        const other = neighborsOf(this.model, b.a).find((k) => k !== b.b)
        const ref = other !== undefined ? pos[other].clone().sub(a) : new THREE.Vector3(0, 0, 1)
        side = ref.sub(dir.clone().multiplyScalar(ref.dot(dir))).normalize()
        if (side.lengthSq() < 1e-6) side.set(0, 0, 1)
      }
      const r = b.order === 2 ? 0.045 : 0.07
      b.mesh.scale.set(r, len, r)
      b.mesh.position.copy(a).addScaledVector(dir, len / 2).addScaledVector(side, b.offset)
      b.mesh.quaternion.setFromUnitVectors(up, dir)
    }
  }
}

/* ------------------------------------------------------------------ helpers */
/** Rotation taking the frame (u, v) onto the frame (u2, v2): u → u2 exactly, v as close as possible. */
function frameRotation(u: THREE.Vector3, v: THREE.Vector3, u2: THREE.Vector3, v2: THREE.Vector3) {
  const basis = (a: THREE.Vector3, b: THREE.Vector3) => {
    const e1 = a.clone().normalize()
    const e2 = b.clone().sub(e1.clone().multiplyScalar(b.dot(e1))).normalize()
    const e3 = e1.clone().cross(e2)
    return new THREE.Matrix4().makeBasis(e1, e2, e3)
  }
  const from = basis(u, v)
  const to = basis(u2, v2)
  return new THREE.Quaternion().setFromRotationMatrix(to.multiply(from.transpose()))
}

/** Atoms reached from `start` without passing through `block`. */
function subtree(m: SMolecule, start: number, block: number) {
  const seen = new Set([start])
  const stack = [start]
  while (stack.length) {
    const i = stack.pop()!
    for (const k of neighborsOf(m, i)) {
      if (k === block || seen.has(k)) continue
      seen.add(k)
      stack.push(k)
    }
  }
  return [...seen]
}

function dihedral(p: THREE.Vector3[], a: number, b: number, c: number, d: number) {
  const b1 = p[b].clone().sub(p[a])
  const b2 = p[c].clone().sub(p[b])
  const b3 = p[d].clone().sub(p[c])
  const n1 = b1.clone().cross(b2)
  const n2 = b2.clone().cross(b3)
  const m1 = n1.clone().cross(b2.clone().normalize())
  return Math.atan2(m1.dot(n2), n1.dot(n2))
}

/** A tweened number: animates toward `to`. */
class Tween {
  from = 0
  to = 0
  t = 1
  value: number
  constructor(value = 0) {
    this.value = value
    this.from = value
    this.to = value
  }
  set(to: number, instant = false) {
    if (instant) {
      this.value = this.from = this.to = to
      this.t = 1
      return
    }
    if (to === this.to) return
    this.from = this.value
    this.to = to
    this.t = 0
  }
  step(dt: number, seconds: number) {
    if (this.t >= 1) return false
    this.t = Math.min(1, this.t + dt / seconds)
    this.value = this.from + (this.to - this.from) * ease(this.t)
    return true
  }
}

/* ------------------------------------------------------------------ the scene */
export class StereoScene {
  readonly stage: Stage3D
  private world = new THREE.Group()
  private root = new THREE.Group() // orientation of the main molecule (pivot: the focused center)
  private main: MolMeshes | null = null
  private copy: MolMeshes | null = null // mirror image
  private other: MolMeshes | null = null // comparison molecule
  private otherRoot = new THREE.Group()
  private copyRoot = new THREE.Group()
  private mirrorGlass: THREE.Mesh
  private planeGlass: THREE.Mesh
  private mirrorEdge: THREE.LineSegments
  private halo: THREE.Mesh
  private arrow = new THREE.Group()
  private arrowMat: THREE.MeshStandardMaterial
  private sphere = sphereGeometry(1, 1)
  private cyl = new THREE.CylinderGeometry(1, 1, 1, 18)
  private mats = new Map<string, GlossyMaterial>()
  private bondMat: GlossyMaterial
  private view: StereoView | null = null
  private base: THREE.Vector3[] = []
  private pos: THREE.Vector3[] = []
  private centerAtom = 0
  private centers: number[] = []

  // Animated quantities
  private qFrom = new THREE.Quaternion()
  private qTo = new THREE.Quaternion()
  private qT = new Tween(1)
  private shift = new Tween(0) // main molecule's x offset (to make room for a mirror or comparison)
  private mirrorK = new Tween(0) // 0 = no mirror, 1 = beside
  private overlayK = new Tween(0) // 0 = beside, 1 = on top
  private swapK = new Tween(0)
  private eclipseK = new Tween(0)
  private arrowK = new Tween(0)
  private planeK = new Tween(0)
  private compareK = new Tween(0)
  private camFrom = new THREE.Vector3(0, 0, 1)
  private camTo = new THREE.Vector3(0, 0, 1)
  private radius = 3
  private alignQ = new THREE.Quaternion()
  private compareQ = new THREE.Quaternion()
  private swapPair: [number, number] | null = null
  private eclipseSpec: [number, number, number, number] | null = null
  private eclipseAngle = 0

  constructor(container: HTMLElement) {
    this.stage = new Stage3D(container, 'stereo')
    this.stage.scene.add(this.world)
    this.world.add(this.root, this.copyRoot, this.otherRoot)
    this.bondMat = glossy({ color: '#c8cde6', roughness: 0.35, clearcoat: 0.4 })

    // The mirror: a pane of faintly tinted glass with a bright edge.
    const glassMat = new THREE.MeshBasicMaterial({ color: '#9fb4ff', transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false })
    this.mirrorGlass = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), glassMat)
    this.mirrorGlass.rotation.y = Math.PI / 2
    // A bright frame around the glass, so the mirror reads as a mirror.
    this.mirrorEdge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(1, 1)), new THREE.LineBasicMaterial({ color: '#b9c6ff', transparent: true, opacity: 0 }))
    this.mirrorGlass.add(this.mirrorEdge)
    this.world.add(this.mirrorGlass)

    const planeMat = new THREE.MeshBasicMaterial({ color: ACCENT, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false })
    this.planeGlass = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.6), planeMat)
    this.root.add(this.planeGlass)

    this.halo = new THREE.Mesh(this.sphere, new THREE.MeshBasicMaterial({ color: ACCENT, transparent: true, opacity: 0.14, depthWrite: false }))
    this.root.add(this.halo)

    this.arrowMat = new THREE.MeshStandardMaterial({ color: ARROW, emissive: ARROW, emissiveIntensity: 0.55, roughness: 0.4, transparent: true, opacity: 0, depthTest: false })
    this.root.add(this.arrow)

    this.stage.onBeforeRender((dt) => this.tick(dt))
  }

  private mat(el: string) {
    let m = this.mats.get(el)
    if (!m) {
      m = glossy({ color: elementStyle(el).color, roughness: 0.3, clearcoat: 0.6, clearcoatRoughness: 0.18 })
      this.mats.set(el, m)
    }
    return m
  }

  private build(model: SMolecule) {
    return new MolMeshes(model, (el) => this.mat(el), this.bondMat, this.sphere, this.cyl)
  }

  /** Show something new. Animates from the current state unless `instant`. */
  setView(v: StereoView, instant = false) {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    instant ||= reduced
    const newModel = !this.view || this.view.model !== v.model
    const newCompare = (this.view?.compare ?? null) !== (v.compare ?? null)
    const center = v.center ?? stereocenters(v.model)[0] ?? this.heaviestCenter(v.model)

    if (newModel) {
      if (this.main) this.root.remove(this.main.group)
      if (this.copy) this.copyRoot.remove(this.copy.group)
      this.main = this.build(v.model)
      this.root.add(this.main.group)
      // The mirror image: the same molecule with x → −x.
      const mirrored: SMolecule = { atoms: v.model.atoms.map((a) => ({ el: a.el, pos: [-a.pos[0], a.pos[1], a.pos[2]] as Vec3 })), bonds: v.model.bonds }
      this.copy = this.build(mirrored)
      this.copyRoot.add(this.copy.group)
      this.base = v.model.atoms.map((a) => V(a.pos))
      this.pos = this.base.map((p) => p.clone())
      // Start a new molecule fresh: no swap, no eclipse, no arrow.
      this.swapK.set(0, true)
      this.eclipseK.set(0, true)
      this.arrowK.set(0, true)
      instant = true
    }
    if (newCompare) {
      if (this.other) this.otherRoot.remove(this.other.group)
      this.other = v.compare ? this.build(v.compare) : null
      if (this.other) this.otherRoot.add(this.other.group)
    }
    if (v.compare) {
      // Turn the comparison molecule so its backbone lines up with the main one's.
      const heavy = neighborsOf(v.model, center).filter((k) => v.model.atoms[k].el !== 'H').slice(0, 2)
      const vecs = (m: SMolecule) => heavy.map((k) => V(m.atoms[k].pos).sub(V(m.atoms[center].pos)))
      const [a, b] = vecs(v.compare)
      const [a2, b2] = vecs(v.model)
      this.compareQ.copy(heavy.length === 2 ? frameRotation(a, b, a2, b2) : new THREE.Quaternion())
    }
    this.view = v
    this.centerAtom = center
    this.centers = stereocenters(v.model)

    // Orientation of the main molecule.
    this.qFrom.copy(this.root.quaternion)
    this.qTo.copy(this.orientation(v, center))
    this.qT.set(0, true)
    this.qT.set(1, instant)
    if (instant) this.root.quaternion.copy(this.qTo)

    // Camera back to looking straight on, so "away from you" really is away.
    this.camFrom.copy(this.stage.camera.position).normalize()
    // With a mirror beside it, look from slightly to the side so the glass reads as a pane.
    this.camTo.set(v.mirror === 'beside' ? 0.22 : 0, v.mirror === 'beside' ? 0.08 : 0, 1).normalize()

    // Swap / eclipse targets.
    const swapSame = this.swapPair && v.swap && this.swapPair[0] === v.swap[0] && this.swapPair[1] === v.swap[1]
    if (v.swap && !swapSame) {
      this.swapPair = v.swap
      this.swapK.set(0, true)
    }
    this.swapK.set(v.swap ? 1 : 0, instant)
    if (!v.swap && this.swapK.value === 0) this.swapPair = null
    if (v.eclipse) {
      this.eclipseSpec = v.eclipse
      this.eclipseAngle = -dihedral(this.base, ...v.eclipse)
    }
    this.eclipseK.set(v.eclipse ? 1 : 0, instant)

    // Mirror and overlay.
    const m = v.mirror ?? null
    this.mirrorK.set(m ? 1 : 0, instant)
    this.overlayK.set(m === 'overlay' ? 1 : 0, instant)
    if (m === 'overlay') this.alignQ.copy(this.overlayAlignment(v, center))
    this.compareK.set(v.compare ? 1 : 0, instant)
    this.arrowK.set(v.arrow ? 1 : 0, instant || !v.arrow)
    this.planeK.set(v.plane ? 1 : 0, instant)

    // Room: a mirror or comparison needs space on the right.
    const r = this.modelRadius(v.model, center)
    this.radius = r
    const wide = (m === 'beside' || v.compare) && m !== 'overlay'
    this.shift.set(wide ? -(r + 0.55) : 0, instant)
    this.frame(wide ? r * 2.1 + 0.9 : r + 0.5, instant)
    this.rebuildArrow()
    this.update()
    this.stage.requestRender()
  }

  /** Where the camera frames: a sphere of this radius. */
  private frame(r: number, instant: boolean) {
    if (instant) {
      this.stage.lookFrom(this.camTo, r)
      this.camFrom.copy(this.camTo)
    } else this.stage.fit(r)
  }

  private heaviestCenter(m: SMolecule) {
    // No stereocenter: pivot on the carbon with the most heavy neighbors.
    let best = 0
    let bestN = -1
    m.atoms.forEach((a, i) => {
      if (a.el !== 'C') return
      const n = neighborsOf(m, i).filter((k) => m.atoms[k].el !== 'H').length
      if (n > bestN) {
        best = i
        bestN = n
      }
    })
    return best
  }

  private modelRadius(m: SMolecule, center: number) {
    const c = V(m.atoms[center].pos)
    return Math.max(1.6, ...m.atoms.map((a) => V(a.pos).distanceTo(c) + radiusOf(a.el)))
  }

  /** Neighbors of the center ranked by priority (or by atomic number if tied). */
  private ranked(m: SMolecule, center: number) {
    return priorities(m, center) ?? neighborsOf(m, center).sort((a, b) => elementStyle(m.atoms[b].el).covalentRadius - elementStyle(m.atoms[a].el).covalentRadius)
  }

  /** The rotation for an orientation mode. */
  private orientation(v: StereoView, center: number) {
    const m = v.model
    const c = V(m.atoms[center].pos)
    const dir = (i: number) => V(m.atoms[i].pos).sub(c).normalize()
    const p = this.ranked(m, center)
    const mode = v.orient ?? 'free'
    if (mode === 'fischer' && v.fischerAxis) {
      const [up, down] = v.fischerAxis.map(dir)
      return frameRotation(up.clone().add(down), up.clone().sub(down), new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, 1, 0))
    }
    if (v.eclipse) {
      // Turning a bond: lay that bond across the screen, with the lined-up groups on top,
      // seen a little from the side so the mirror plane shows as a thin pane.
      const [a, b, cc] = v.eclipse
      const along = V(m.atoms[cc].pos).sub(V(m.atoms[b].pos))
      const upish = V(m.atoms[a].pos).sub(V(m.atoms[b].pos))
      const q = frameRotation(along, upish, new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0))
      // Roll 40° around the bond so the three pairs of groups sit at different heights, then
      // turn a little so the mirror plane shows as a narrow pane.
      const roll = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -0.7)
      const yaw = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -0.38)
      return yaw.multiply(roll).multiply(q)
    }
    // Lowest group straight back (or forward), group 1 at the top.
    const lowest = dir(p[3])
    const back = new THREE.Vector3(0, 0, mode === 'lowest-toward' ? 1 : -1)
    const q = frameRotation(lowest, dir(p[0]), back, new THREE.Vector3(0, 1, 0))
    if (mode === 'free') {
      // A natural 3D view: tip it so the molecule's depth is visible.
      const tilt = new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.85, 0.45, 0))
      return tilt.multiply(q)
    }
    return q
  }

  /** How to turn the mirror image so groups a and b land exactly on the original's. */
  private overlayAlignment(v: StereoView, center: number) {
    const m = v.model
    const nb = neighborsOf(m, center)
    const pair = v.align && v.align.every((a) => nb.includes(a)) ? v.align : (this.ranked(m, center).slice(0, 2) as [number, number])
    const c = V(m.atoms[center].pos)
    const orig = pair.map((i) => V(m.atoms[i].pos).sub(c))
    const mir = orig.map((p) => new THREE.Vector3(-p.x, p.y, p.z))
    // Rotation (in model space) taking the mirror image's a, b directions onto the original's.
    return frameRotation(mir[0], mir[1], orig[0], orig[1])
  }

  /* ---------------------------------------------------------------- per-frame */
  private tick(dt: number) {
    let moving = false
    const step = (t: Tween, s: number) => {
      if (t.step(dt, s)) moving = true
    }
    step(this.qT, 0.9)
    step(this.shift, 0.7)
    step(this.mirrorK, 0.6)
    step(this.overlayK, 1.4)
    step(this.swapK, 1.1)
    step(this.eclipseK, 1.3)
    // The arrow draws itself once the molecule has finished turning.
    if (this.qT.t >= 1) step(this.arrowK, 0.8)
    else if (this.arrowK.to > 0) moving = true
    if (this.eclipseK.t >= 1) step(this.planeK, 0.5)
    else if (this.planeK.to > 0) moving = true
    step(this.compareK, 0.6)
    // Camera glides back to straight-on while the molecule turns.
    if (this.qT.t < 1) {
      const d = this.stage.camera.position.length()
      const dirNow = this.camFrom.clone().lerp(this.camTo, ease(this.qT.t)).normalize()
      this.stage.camera.position.copy(dirNow.multiplyScalar(d))
      this.stage.controls.update()
    }
    if (moving) this.update()
    return moving
  }

  /** Recompute positions and poses from the animated values. */
  private update() {
    const v = this.view
    if (!v || !this.main || !this.copy) return
    const c = this.base[this.centerAtom]

    // 1. Positions of the main molecule (swap and eclipse change them).
    this.pos = this.base.map((p) => p.clone())
    if (this.swapPair && this.swapK.value > 0) {
      const [a, b] = this.swapPair
      const da = this.base[a].clone().sub(c).normalize()
      const db = this.base[b].clone().sub(c).normalize()
      const axis = da.clone().cross(db).normalize()
      const angle = Math.acos(THREE.MathUtils.clamp(da.dot(db), -1, 1)) * this.swapK.value
      // The two groups travel along opposite sides of an arc (one lifted slightly), so they pass each other.
      const lift = c.clone().sub(this.base[neighborsOf(v.model, this.centerAtom).find((k) => k !== a && k !== b)!]).normalize()
      const bump = Math.sin(Math.PI * this.swapK.value) * 0.35
      for (const [grp, sign] of [
        [subtree(v.model, a, this.centerAtom), 1],
        [subtree(v.model, b, this.centerAtom), -1],
      ] as const) {
        const q = new THREE.Quaternion().setFromAxisAngle(axis, angle * sign)
        for (const i of grp) this.pos[i] = this.base[i].clone().sub(c).applyQuaternion(q).add(c).addScaledVector(lift, bump * sign)
      }
    }
    if (this.eclipseSpec && this.eclipseK.value > 0) {
      const [, b, cc] = this.eclipseSpec
      const axis = this.base[cc].clone().sub(this.base[b]).normalize()
      const q = new THREE.Quaternion().setFromAxisAngle(axis, this.eclipseAngle * this.eclipseK.value)
      for (const i of subtree(v.model, cc, b)) if (i !== cc) this.pos[i] = this.base[i].clone().sub(this.base[cc]).applyQuaternion(q).add(this.base[cc])
    }
    this.main.place(this.pos)
    this.main.group.position.copy(c).negate()

    // 2. The main molecule's pose.
    if (this.qT.t < 1) this.root.quaternion.slerpQuaternions(this.qFrom, this.qTo, ease(this.qT.t))
    this.root.position.set(this.shift.value, 0, 0)

    // Halo on the focused stereocenter.
    const isCenter = this.centers.includes(this.centerAtom)
    this.halo.visible = isCenter
    this.halo.position.copy(this.pos[this.centerAtom]).sub(c)
    this.halo.scale.setScalar(radiusOf(v.model.atoms[this.centerAtom].el) + 0.16)

    // 3. The mirror image (reflection of the main molecule across the glass at x = 0).
    const showMirror = this.mirrorK.value > 0.001
    this.copyRoot.visible = showMirror
    const glass = this.mirrorGlass.material as THREE.MeshBasicMaterial
    glass.opacity = 0.07 * this.mirrorK.value * (1 - this.overlayK.value)
    ;(this.mirrorEdge.material as THREE.LineBasicMaterial).opacity = glass.opacity * 4.5
    this.mirrorGlass.visible = glass.opacity > 0.002
    const h = this.radius * 2.2
    this.mirrorGlass.scale.set(h, h, 1)
    if (showMirror) {
      this.copy.place(this.base.map((p) => new THREE.Vector3(-p.x, p.y, p.z)))
      this.copy.group.position.set(c.x, -c.y, -c.z) // pivot on the mirrored center
      // Beside: exact reflection of the original's pose. Overlay: turned to line up two groups.
      const F = new THREE.Matrix4().makeScale(-1, 1, 1)
      const R = new THREE.Matrix4().makeRotationFromQuaternion(this.root.quaternion)
      const qBeside = new THREE.Quaternion().setFromRotationMatrix(F.clone().multiply(R).multiply(F))
      const qOver = this.root.quaternion.clone().multiply(this.alignQ)
      const k = this.overlayK.value
      this.copyRoot.quaternion.slerpQuaternions(qBeside, qOver, k)
      const pBeside = new THREE.Vector3(-this.root.position.x, 0, 0)
      this.copyRoot.position.lerpVectors(pBeside, this.root.position, k)
      // Fade the mirror image in as it appears.
      this.copyRoot.scale.setScalar(0.6 + 0.4 * this.mirrorK.value)
      // Laid on top, the mirror image's own hydrogens on other carbons would just double up
      // (their exact twist doesn't matter), so only the groups on the stereocenter are kept.
      const onTop = k > 0.5
      const keep = new Set([this.centerAtom, ...neighborsOf(v.model, this.centerAtom)])
      this.copy.atoms.forEach((a, i) => (a.visible = !onTop || keep.has(i) || v.model.atoms[i].el !== 'H'))
      for (const b of this.copy.bonds) b.mesh.visible = this.copy.atoms[b.a].visible && this.copy.atoms[b.b].visible
    }

    // 4. The comparison molecule, same orientation, on the right.
    this.otherRoot.visible = !!this.other && this.compareK.value > 0.001
    if (this.other && v.compare) {
      this.other.place(v.compare.atoms.map((a) => V(a.pos)))
      const oc = V(v.compare.atoms[Math.min(this.centerAtom, v.compare.atoms.length - 1)].pos)
      this.other.group.position.copy(oc).negate()
      this.otherRoot.quaternion.copy(this.root.quaternion).multiply(this.compareQ)
      this.otherRoot.position.set(-this.shift.value, 0, 0)
      this.otherRoot.scale.setScalar(0.6 + 0.4 * this.compareK.value)
    }

    // 5. Mirror plane for meso (through the middle of bond b–c, perpendicular to it).
    const pm = this.planeGlass.material as THREE.MeshBasicMaterial
    pm.opacity = 0.16 * this.planeK.value
    this.planeGlass.visible = pm.opacity > 0.002 && !!this.eclipseSpec
    if (this.eclipseSpec) {
      const [, b, cc] = this.eclipseSpec
      const mid = this.pos[b].clone().add(this.pos[cc]).multiplyScalar(0.5).sub(c)
      const n = this.pos[cc].clone().sub(this.pos[b]).normalize()
      this.planeGlass.position.copy(mid)
      this.planeGlass.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), n)
    }

    // 6. The 1 → 2 → 3 arrow grows along its path.
    this.arrowMat.opacity = Math.min(1, this.arrowK.value * 2)
    this.arrow.visible = this.arrowK.value > 0.001
    const tube = this.arrow.children[0] as THREE.Mesh | undefined
    if (tube) {
      const count = tube.geometry.index!.count
      tube.geometry.setDrawRange(0, Math.floor((count * Math.min(1, this.arrowK.value * 1.15)) / 6) * 6)
      const head = this.arrow.children[1]
      head.visible = this.arrowK.value > 0.85
    }
    this.stage.requestRender()
  }

  /** Build the curved arrow around the focused center, in the plane facing the viewer. */
  private rebuildArrow() {
    this.arrow.children.forEach((o) => (o as THREE.Mesh).geometry.dispose())
    this.arrow.clear()
    const v = this.view
    if (!v || !v.arrow) return
    const m = v.model
    const p = priorities(m, this.centerAtom)
    if (!p) return
    const c = V(m.atoms[this.centerAtom].pos)
    const d = (i: number) => V(m.atoms[i].pos).sub(c)
    const n = d(p[3]).normalize() // lowest group
    const e1 = d(p[0]).sub(n.clone().multiplyScalar(d(p[0]).dot(n))).normalize()
    const e2 = n.clone().cross(e1)
    const angle = (i: number) => {
      const x = d(i)
      return Math.atan2(x.dot(e2), x.dot(e1))
    }
    const a1 = 0
    let a2 = angle(p[1])
    let a3 = angle(p[2])
    // Go 1 → 2 → 3 the short way around.
    const dirSign = Math.sign(a2) || 1
    if (dirSign > 0) {
      if (a2 < 0) a2 += Math.PI * 2
      if (a3 < a2) a3 += Math.PI * 2
    } else {
      if (a2 > 0) a2 -= Math.PI * 2
      if (a3 > a2) a3 -= Math.PI * 2
    }
    const r = 0.95
    const lift = n.clone().multiplyScalar(-0.35) // a little toward the side opposite the lowest group
    const pts: THREE.Vector3[] = []
    const start = a1 + dirSign * 0.32
    const end = a3 - dirSign * 0.32
    for (let k = 0; k <= 48; k++) {
      const t = start + ((end - start) * k) / 48
      pts.push(e1.clone().multiplyScalar(Math.cos(t) * r).add(e2.clone().multiplyScalar(Math.sin(t) * r)).add(lift))
    }
    const curve = new THREE.CatmullRomCurve3(pts)
    const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 64, 0.04, 10, false), this.arrowMat)
    const head = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.26, 18), this.arrowMat)
    const tip = curve.getPoint(1)
    const tangent = curve.getTangent(1)
    head.position.copy(tip).addScaledVector(tangent, 0.1)
    head.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangent)
    for (const o of [tube, head]) o.renderOrder = 10
    this.arrow.add(tube, head)
  }

  /* ---------------------------------------------------------------- labels */
  /** The current positions (model coordinates) of the main molecule's atoms, after any swap. */
  currentModel(): SMolecule | null {
    if (!this.view) return null
    if (!this.swapPair || this.swapK.value < 1) return this.view.model
    return { atoms: this.view.model.atoms.map((a, i) => ({ el: a.el, pos: this.pos[i].toArray() as Vec3 })), bonds: this.view.model.bonds }
  }

  /** Labels for the HTML overlay, in world coordinates. */
  labels(opts: { priorities: boolean; rs: boolean; elements: boolean }): StereoLabel[] {
    const v = this.view
    if (!v || !this.main) return []
    const out: StereoLabel[] = []
    const c = this.base[this.centerAtom]
    const world = (p: THREE.Vector3) => p.clone().sub(c).applyQuaternion(this.root.quaternion).add(this.root.position)
    const m = this.currentModel()!
    if (opts.elements)
      v.model.atoms.forEach((a, i) => {
        if (a.el !== 'C' && a.el !== 'H') out.push({ key: `el${i}`, text: a.el, kind: 'element', pos: world(this.pos[i]) })
      })
    const centers = this.centers
    if (opts.priorities && centers.includes(this.centerAtom)) {
      const p = priorities(m, this.centerAtom)
      p?.forEach((i, k) => {
        const dir = this.pos[i].clone().sub(this.pos[this.centerAtom]).normalize()
        out.push({ key: `p${i}`, text: String(k + 1), kind: 'priority', rank: k + 1, pos: world(this.pos[i].clone().addScaledVector(dir, radiusOf(v.model.atoms[i].el) + 0.28)) })
      })
    }
    if (opts.rs && (this.swapK.value === 0 || this.swapK.value === 1))
      for (const a of centers) {
        const rs = descriptor(m, a)
        if (!rs) continue
        // Below-front of the center atom.
        out.push({ key: `rs${a}`, text: rs, kind: 'rs', pos: world(this.pos[a]).add(new THREE.Vector3(0, -0.42, 0.3)) })
      }
    // R/S on the mirror image and on the comparison molecule, too.
    if (opts.rs && v.mirror === 'beside' && this.mirrorK.value > 0.98 && this.copy)
      for (const a of centers) {
        const rs = descriptor(this.copy.model, a)
        if (rs) out.push({ key: `mrs${a}`, text: rs, kind: 'rs', pos: this.copy.atoms[a].getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, -0.42, 0.3)) })
      }
    if (opts.rs && v.compare && this.other && this.compareK.value > 0.98)
      for (const a of stereocenters(v.compare)) {
        const rs = descriptor(v.compare, a)
        if (rs) out.push({ key: `crs${a}`, text: rs, kind: 'rs', pos: this.other.atoms[a].getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, -0.42, 0.3)) })
      }
    // After sliding the mirror image on top: mark the groups that don't line up.
    if (v.mirror === 'overlay' && this.overlayK.value > 0.98 && this.copy) {
      // A group matches if the mirror image has the same element in the same place (equal
      // groups, like 2-propanol's two methyls, may trade places and still match).
      const copyAtoms = this.copy.atoms.map((a) => a.getWorldPosition(new THREE.Vector3()))
      for (const i of neighborsOf(v.model, this.centerAtom)) {
        const mine = this.main.atoms[i].getWorldPosition(new THREE.Vector3())
        const ok = v.model.atoms.some((a, j) => a.el === v.model.atoms[i].el && copyAtoms[j].distanceTo(mine) < 0.35)
        if (!ok) out.push({ key: `mm${i}`, text: '✕', kind: 'mismatch', pos: mine })
      }
    }
    return out
  }

  /** True if, after the overlay, every group lines up (an achiral molecule). */
  superimposes() {
    const v = this.view
    if (!v || !this.copy || !this.main) return false
    return neighborsOf(v.model, this.centerAtom).every((i) => {
      const mine = this.main!.atoms[i].getWorldPosition(new THREE.Vector3())
      // Same element anywhere near counts (equal groups may swap places).
      return v.model.atoms.some((a, j) => a.el === v.model.atoms[i].el && this.copy!.atoms[j].getWorldPosition(new THREE.Vector3()).distanceTo(mine) < 0.35)
    })
  }

  /** The main molecule's atom under a screen point (CSS pixels in the canvas), or null. */
  pick(x: number, y: number): number | null {
    if (!this.main) return null
    const el = this.stage.renderer.domElement
    const ndc = new THREE.Vector2((x / el.clientWidth) * 2 - 1, -(y / el.clientHeight) * 2 + 1)
    const ray = new THREE.Raycaster()
    ray.setFromCamera(ndc, this.stage.camera)
    const hit = ray.intersectObjects(this.main.atoms, false)[0]
    return hit ? this.main.atoms.indexOf(hit.object as THREE.Mesh) : null
  }

  resetView() {
    this.stage.lookFrom(new THREE.Vector3(0, 0, 1), this.view?.mirror === 'beside' || this.view?.compare ? this.radius * 2.1 + 0.9 : this.radius + 0.5)
  }

  dispose() {
    this.arrow.children.forEach((o) => (o as THREE.Mesh).geometry.dispose())
    this.mats.forEach((m) => m.dispose())
    this.bondMat.dispose()
    this.arrowMat.dispose()
    this.stage.dispose()
  }
}
