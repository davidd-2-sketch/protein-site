/*
  ReactionScene.ts — the 3D view for an animated reaction (built on Three.js).

  It plays any Mechanism (SN2 by default, SN1, ...; see mechanism.ts).
  The page tells it one number, the reaction progress s (0 → 1), with setProgress(s).
  The scene then:
    • moves every atom to its position at s,
    • draws bonds: solid when formed, dashed when partial, hidden when broken,
    • draws glowing curved arrows (electron flow) and moving electron pairs.

  PERFORMANCE: it only redraws when something changes (progress, camera, size),
  so a paused reaction costs almost nothing.
*/
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { elementStyle } from '../three/elements'
import { countFrame } from '../dev/frameCounter'
import { addLighting, createRenderer, glossy, sphereGeometry, watchRenderer, type GlossyMaterial } from '../three/quality3d'
import type { Mechanism } from './mechanism'
import { clamp01, SN2, type Vec } from './sn2Geometry'

const ballRadius = (el: string) => 0.17 + 0.2 * elementStyle(el).covalentRadius
const BOND_RADIUS = 0.09
const DASHES = 7
const ELECTRON = '#ffc94d'

/* Direction the curved arrows bulge toward: up and toward the default camera,
   in a gap between the groups on carbon, so arrows are never hidden. */
const BULGE = new THREE.Vector3(0, Math.cos(Math.PI / 6), Math.sin(Math.PI / 6)).normalize()

export interface SceneOptions {
  arrows: boolean
}

/** A glowing curved arrow made of a tube plus a cone tip. */
class CurvedArrow {
  group = new THREE.Group()
  private tube: THREE.Mesh
  private head: THREE.Mesh
  private material: THREE.MeshStandardMaterial
  curve = new THREE.QuadraticBezierCurve3()

  constructor() {
    this.material = new THREE.MeshStandardMaterial({
      color: ELECTRON,
      emissive: ELECTRON,
      emissiveIntensity: 0.9,
      roughness: 0.4,
      transparent: true,
    })
    this.tube = new THREE.Mesh(new THREE.BufferGeometry(), this.material)
    this.head = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.38, 24), this.material)
    this.group.add(this.tube, this.head)
  }

  /** Re-shape the arrow to run from `tail` to `head`, bowing out by `bow` Å. */
  update(tail: THREE.Vector3, tip: THREE.Vector3, bow: number, opacity: number) {
    this.group.visible = opacity > 0.01
    if (!this.group.visible) return
    this.material.opacity = opacity
    const mid = tail.clone().lerp(tip, 0.5).addScaledVector(BULGE, bow)
    this.curve.v0.copy(tail)
    this.curve.v1.copy(mid)
    this.curve.v2.copy(tip)
    this.tube.geometry.dispose()
    this.tube.geometry = new THREE.TubeGeometry(this.curve, 40, 0.045, 12, false)
    // Arrowhead sits at the tip, pointing along the curve's final direction.
    const dir = this.curve.getTangent(1).normalize()
    this.head.position.copy(tip)
    this.head.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir)
  }

  dispose() {
    this.tube.geometry.dispose()
    this.head.geometry.dispose()
    this.material.dispose()
  }
}

export class ReactionScene {
  private renderer: THREE.WebGLRenderer
  private scene = new THREE.Scene()
  private camera = new THREE.PerspectiveCamera(30, 1, 0.1, 200)
  private controls: OrbitControls
  private container: HTMLElement
  private atomMeshes = new Map<string, THREE.Mesh>()
  private solidBonds = new Map<string, [THREE.Mesh, THREE.Mesh]>()
  private dashedBonds = new Map<string, THREE.Mesh[]>()
  private arrows: CurvedArrow[] = []
  private mechanism: Mechanism
  private electrons: THREE.Mesh[] = []
  private materials = new Map<string, GlossyMaterial>()
  private watcher: ReturnType<typeof watchRenderer>
  private dashMaterial: THREE.MeshStandardMaterial
  private positions = new Map<string, THREE.Vector3>()
  private s = 0
  private options: SceneOptions = { arrows: true }
  private needsRender = true
  private frameId = 0
  private resizeObserver: ResizeObserver
  private renderListeners: (() => void)[] = []
  private disposed = false

  constructor(container: HTMLElement, mechanism: Mechanism = SN2) {
    this.container = container
    this.mechanism = mechanism

    // ---------- Renderer (same quality settings as the home-page molecule) ----------
    // Renderer and lights follow the device's graphics profile (fast or detailed).
    this.renderer = createRenderer(container)
    addLighting(this.scene, this.renderer)
    this.watcher = watchRenderer(this.renderer, () => (this.needsRender = true))

    // Classic textbook view: nucleophile on the left, leaving group on the right,
    // seen slightly from above and to the side so the 3D "umbrella" is visible.
    this.camera.position.set(4, 4.5, 20)
    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.08
    this.controls.enablePan = false
    this.controls.minDistance = 6
    this.controls.maxDistance = 40
    this.controls.addEventListener('change', () => (this.needsRender = true))

    this.dashMaterial = new THREE.MeshStandardMaterial({ color: '#e9ecff', roughness: 0.5, transparent: true, opacity: 0.85 })
    this.build()

    this.resizeObserver = new ResizeObserver(() => this.resize())
    this.resizeObserver.observe(container)
    this.resize()
    this.setProgress(0)
    this.animate()
  }

  /* ----------------------------------------------------------- public */

  /** Move the reaction to progress s (0 = reactants, 0.5 = transition state, 1 = products). */
  setProgress(s: number) {
    this.s = clamp01(s)
    this.update()
    this.needsRender = true
  }

  setOptions(o: Partial<SceneOptions>) {
    this.options = { ...this.options, ...o }
    this.update()
    this.needsRender = true
  }

  /** Current 3D position of an atom (by id, e.g. "O" or "C2"). */
  atomPosition(id: string): THREE.Vector3 | undefined {
    return this.positions.get(id)
  }

  /** Screen position (CSS pixels from the canvas's top-left) of a 3D point. */
  project(p: THREE.Vector3): { x: number; y: number; behind: boolean } {
    const v = p.clone().project(this.camera)
    const { clientWidth: w, clientHeight: h } = this.container
    return { x: ((v.x + 1) / 2) * w, y: ((1 - v.y) / 2) * h, behind: v.z > 1 }
  }

  /** Called after each redraw, e.g. to move HTML labels. Returns an unsubscribe function. */
  onRender(fn: () => void) {
    this.renderListeners.push(fn)
    return () => {
      this.renderListeners = this.renderListeners.filter((f) => f !== fn)
    }
  }

  resetCamera() {
    this.camera.position.set(4, 4.5, 20)
    this.controls.target.set(0, 0, 0)
    this.fitCamera()
  }

  dispose() {
    this.disposed = true
    cancelAnimationFrame(this.frameId)
    this.resizeObserver.disconnect()
    this.scene.traverse((o) => {
      if (o instanceof THREE.Mesh) o.geometry.dispose()
    })
    this.arrows.forEach((a) => a.dispose())
    this.materials.forEach((m) => m.dispose())
    this.dashMaterial.dispose()
    this.scene.environment?.dispose()
    this.controls.dispose()
    this.renderer.dispose()
    this.renderer.domElement.remove()
  }

  /* ----------------------------------------------------------- building */

  private materialFor(element: string) {
    let m = this.materials.get(element)
    if (!m) {
      m = glossy({ color: elementStyle(element).color, roughness: 0.32, clearcoat: 0.55, clearcoatRoughness: 0.18 })
      this.materials.set(element, m)
    }
    return m
  }

  /** Create every mesh once. Later frames only move them (much faster than rebuilding). */
  private build() {
    const sphere = sphereGeometry()
    const cylinder = new THREE.CylinderGeometry(1, 1, 1, 24, 1, true)

    const atoms0 = this.mechanism.atoms(0)
    for (const atom of atoms0) {
      const mesh = new THREE.Mesh(sphere, this.materialFor(atom.element))
      mesh.scale.setScalar(ballRadius(atom.element))
      this.atomMeshes.set(atom.id, mesh)
      this.scene.add(mesh)
    }

    for (const bond of this.mechanism.bonds(0)) {
      const key = `${bond.a}-${bond.b}`
      const elA = atoms0.find((a) => a.id === bond.a)!.element
      const elB = atoms0.find((a) => a.id === bond.b)!.element
      const halves: [THREE.Mesh, THREE.Mesh] = [new THREE.Mesh(cylinder, this.materialFor(elA)), new THREE.Mesh(cylinder, this.materialFor(elB))]
      halves.forEach((h) => this.scene.add(h))
      this.solidBonds.set(key, halves)
      const dashes = Array.from({ length: DASHES }, () => new THREE.Mesh(cylinder, this.dashMaterial))
      dashes.forEach((d) => this.scene.add(d))
      this.dashedBonds.set(key, dashes)
    }

    // One arrow per arrow the mechanism ever draws, each with an electron pair (two small glowing spheres).
    this.arrows = this.mechanism.arrows(0, atoms0).map(() => new CurvedArrow())
    this.arrows.forEach((a) => this.scene.add(a.group))

    const eMat = new THREE.MeshStandardMaterial({ color: ELECTRON, emissive: ELECTRON, emissiveIntensity: 1.2, transparent: true })
    const eGeo = new THREE.SphereGeometry(0.075, 16, 12)
    for (let i = 0; i < 2 * this.arrows.length; i++) {
      const e = new THREE.Mesh(eGeo, eMat)
      this.electrons.push(e)
      this.scene.add(e)
    }
  }

  /** Place everything for the current progress s. */
  private update() {
    const s = this.s
    const atoms = this.mechanism.atoms(s)
    for (const atom of atoms) {
      const p = new THREE.Vector3(...(atom.position as Vec))
      this.positions.set(atom.id, p)
      this.atomMeshes.get(atom.id)!.position.copy(p)
    }

    for (const bond of this.mechanism.bonds(s)) {
      const key = `${bond.a}-${bond.b}`
      const a = this.positions.get(bond.a)!
      const b = this.positions.get(bond.b)!
      const [h1, h2] = this.solidBonds.get(key)!
      const dashes = this.dashedBonds.get(key)!
      const solid = bond.order >= 0.85
      const partial = bond.order > 0.12 && !solid
      h1.visible = h2.visible = solid
      dashes.forEach((d) => (d.visible = partial))
      if (solid) {
        const mid = a.clone().lerp(b, 0.5)
        placeCylinder(h1, a, mid, BOND_RADIUS)
        placeCylinder(h2, mid, b, BOND_RADIUS)
      } else if (partial) {
        // Dashes along the bond, skipping the parts hidden inside the atoms.
        dashes.forEach((d, i) => {
          const t0 = (i + 0.2) / DASHES
          const t1 = (i + 0.7) / DASHES
          placeCylinder(d, a.clone().lerp(b, t0), a.clone().lerp(b, t1), BOND_RADIUS * 0.7)
        })
      }
    }

    this.updateArrows(atoms)
  }

  /** Curved arrows + travelling electron pairs. */
  private updateArrows(atoms: ReturnType<Mechanism['atoms']>) {
    const V = (p: readonly number[]) => new THREE.Vector3(p[0], p[1], p[2])
    const side = new THREE.Vector3(0, 0, 1)
    this.mechanism.arrows(this.s, atoms).forEach((spec, k) => {
      const arrow = this.arrows[k]
      arrow.update(V(spec.tail), V(spec.tip), spec.bow, this.options.arrows ? spec.opacity : 0)
      // The electron pair rides along the arrow while that step's electrons are moving.
      const t = Math.min(spec.travel, 0.98)
      const on = this.options.arrows && spec.travel > 0 && spec.travel < 1
      const [e1, e2] = [this.electrons[2 * k], this.electrons[2 * k + 1]]
      e1.visible = e2.visible = on
      if (!on) return
      const point = arrow.curve.getPoint(t)
      const offset = side.clone().cross(arrow.curve.getTangent(t)).normalize().multiplyScalar(0.09)
      e1.position.copy(point).add(offset)
      e2.position.copy(point).sub(offset)
    })
  }

  /* ----------------------------------------------------------- camera, size, loop */

  /** Pull the camera back just enough to fit the whole reaction (the mechanism's extent). */
  private fitCamera() {
    const { halfW, halfH } = this.mechanism.extent
    const vFov = THREE.MathUtils.degToRad(this.camera.fov / 2)
    const dist = Math.max(halfH / Math.tan(vFov), halfW / (Math.tan(vFov) * this.camera.aspect))
    const dir = this.camera.position.clone().sub(this.controls.target).normalize()
    this.camera.position.copy(this.controls.target).addScaledVector(dir, dist)
    this.controls.update()
    this.needsRender = true
  }

  private resize() {
    const { clientWidth: w, clientHeight: h } = this.container
    if (!w || !h) return
    this.renderer.setSize(w, h, false)
    this.renderer.domElement.style.width = '100%'
    this.renderer.domElement.style.height = '100%'
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
    this.fitCamera()
  }

  private animate = () => {
    if (this.disposed) return
    this.frameId = requestAnimationFrame(this.animate)
    this.controls.update()
    if (!this.needsRender) return
    this.needsRender = false
    this.renderer.render(this.scene, this.camera)
    this.watcher.frame(performance.now())
    countFrame('reaction')
    this.renderListeners.forEach((fn) => fn())
  }
}

/** Stretch a unit cylinder between two points. */
function placeCylinder(mesh: THREE.Mesh, a: THREE.Vector3, b: THREE.Vector3, r: number) {
  const dir = b.clone().sub(a)
  mesh.scale.set(r, dir.length(), r)
  mesh.position.copy(a).addScaledVector(dir, 0.5)
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize())
}
