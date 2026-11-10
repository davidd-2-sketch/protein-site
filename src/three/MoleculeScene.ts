/*
  MoleculeScene.ts — a reusable, high-quality 3D ball-and-stick renderer built on Three.js.

  How a 3D scene works (the 30-second version):
    • Scene    — the "world" that holds every object.
    • Camera   — where we look from. We use a perspective camera (far things look smaller).
    • Renderer — draws the scene from the camera into a <canvas> element, ~60 times per second.
    • Meshes   — visible objects. Each mesh = a geometry (shape) + a material (surface look).
    • Lights   — without them, everything is black.

  Quality choices that make this look crisp instead of toy-like:
    • Antialiasing + the screen's real pixel density → smooth edges, no jaggies.
    • Physically based materials (MeshPhysicalMaterial) + a soft "environment map"
      → atoms reflect light like glossy objects in a real room.
    • High-detail spheres (64×48 segments) → perfectly round silhouettes.
    • "Neutral" tone mapping → bright highlights roll off gently while colors stay accurate.
*/
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { elementStyle } from './elements'
import type { MoleculeData } from './types'
import { countFrame } from '../dev/frameCounter'

export interface HoveredAtom {
  index: number
  element: string
  elementName: string
  /** How many atoms this atom is bonded to. */
  bondCount: number
}

export interface MoleculeSceneOptions {
  /** Slowly spin the molecule when nobody is touching it. */
  autoRotate?: boolean
  /** Allow scroll-wheel zoom. Off on the home page so scrolling the page still works. */
  enableZoom?: boolean
  /** Called whenever the mouse moves onto (or off) an atom. */
  onHover?: (atom: HoveredAtom | null) => void
}

// Sizes for ball-and-stick, in ångströms.
const BOND_RADIUS = 0.085
const MULTI_BOND_RADIUS = 0.055
const MULTI_BOND_OFFSET = 0.085
const ballRadius = (element: string) => 0.17 + 0.2 * elementStyle(element).covalentRadius

export class MoleculeScene {
  private renderer: THREE.WebGLRenderer
  private scene = new THREE.Scene()
  private camera = new THREE.PerspectiveCamera(32, 1, 0.1, 500)
  private controls: OrbitControls
  private root = new THREE.Group() // everything molecular hangs off this group
  private atomMeshes: THREE.Mesh[] = []
  private materials = new Map<string, THREE.MeshPhysicalMaterial>()
  private raycaster = new THREE.Raycaster()
  private pointer = new THREE.Vector2()
  private pointerInside = false
  /** True when the mouse moved (or the camera turned) since we last checked what's under it. */
  private pointerDirty = false
  private hovered: THREE.Mesh | null = null
  private bondCounts: number[] = []
  private resizeObserver: ResizeObserver
  private visibilityObserver: IntersectionObserver
  private isVisible = true
  private frameId = 0
  private disposed = false
  // ---- Render-on-demand bookkeeping (saves battery and heat) ----
  private timer = new THREE.Timer()
  private lastRender = 0
  private needsRender = true
  private interacting = false
  private container: HTMLElement
  private options: MoleculeSceneOptions

  constructor(container: HTMLElement, options: MoleculeSceneOptions = {}) {
    this.container = container
    this.options = options

    // ---------- Renderer ----------
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' })
    // Sharp on Retina, but capped at 1.5× (2× would mean ~78% more pixels to shade).
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.toneMapping = THREE.NeutralToneMapping
    this.renderer.toneMappingExposure = 1.05
    this.renderer.domElement.style.display = 'block'
    container.appendChild(this.renderer.domElement)

    // ---------- Lighting ----------
    // A virtual "room" gives soft, realistic reflections on every glossy atom.
    const pmrem = new THREE.PMREMGenerator(this.renderer)
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    this.scene.environmentIntensity = 0.55
    pmrem.dispose()

    // Key light (main, from upper left) + cool rim light (from behind) to outline edges.
    const key = new THREE.DirectionalLight('#ffffff', 2.2)
    key.position.set(-4, 6, 8)
    const rim = new THREE.DirectionalLight('#8fe9ff', 1.4)
    rim.position.set(6, -2, -8)
    this.scene.add(key, rim, new THREE.AmbientLight('#ffffff', 0.15))
    this.scene.add(this.root)

    // ---------- Camera controls ----------
    // OrbitControls = click-and-drag to rotate around the molecule.
    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true // gentle "glide" after you let go
    this.controls.dampingFactor = 0.08
    this.controls.enablePan = false
    this.controls.enableZoom = options.enableZoom ?? true
    this.controls.rotateSpeed = 0.7
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    this.controls.autoRotate = (options.autoRotate ?? false) && !reducedMotion
    this.controls.autoRotateSpeed = 0.9
    // Pause auto-rotation while the user is dragging; resume shortly after.
    let resumeTimer = 0
    this.controls.addEventListener('start', () => {
      window.clearTimeout(resumeTimer)
      this.controls.autoRotate = false
      this.interacting = true
    })
    this.controls.addEventListener('change', () => (this.needsRender = true))
    this.controls.addEventListener('end', () => {
      this.interacting = false
      resumeTimer = window.setTimeout(() => {
        this.controls.autoRotate = (options.autoRotate ?? false) && !reducedMotion
      }, 2500)
    })

    // ---------- Hover detection ----------
    const el = this.renderer.domElement
    el.addEventListener('pointermove', this.handlePointerMove)
    el.addEventListener('pointerleave', this.handlePointerLeave)

    // ---------- Keep the canvas sized to its container ----------
    this.resizeObserver = new ResizeObserver(() => this.resize())
    this.resizeObserver.observe(container)
    this.resize()

    // Only draw while the canvas is on screen (saves battery when scrolled away).
    this.visibilityObserver = new IntersectionObserver(([entry]) => {
      this.isVisible = entry.isIntersecting
    })
    this.visibilityObserver.observe(container)

    this.animate()
  }

  /** Build atoms and bonds from data, then frame the camera on the molecule. */
  setMolecule(data: MoleculeData) {
    this.clearMolecule()

    // Center the molecule on (0,0,0) so it spins around its own middle.
    const positions = data.atoms.map(([, x, y, z]) => new THREE.Vector3(x, y, z))
    const center = new THREE.Box3().setFromPoints(positions).getCenter(new THREE.Vector3())
    positions.forEach((p) => p.sub(center))

    // Neighbor list: which atoms each atom is bonded to.
    const neighbors: number[][] = data.atoms.map(() => [])
    data.bonds.forEach(([a, b]) => {
      neighbors[a].push(b)
      neighbors[b].push(a)
    })
    this.bondCounts = neighbors.map((n) => n.length)

    // ---------- Atoms ----------
    const sphere = new THREE.SphereGeometry(1, 64, 48)
    data.atoms.forEach(([element], i) => {
      const mesh = new THREE.Mesh(sphere, this.materialFor(element))
      mesh.position.copy(positions[i])
      mesh.scale.setScalar(ballRadius(element))
      mesh.userData = { index: i, element }
      this.atomMeshes.push(mesh)
      this.root.add(mesh)
    })

    // ---------- Bonds ----------
    // Each bond is drawn as two half-cylinders, each colored like the atom it touches.
    const cylinder = new THREE.CylinderGeometry(1, 1, 1, 32, 1, true)
    data.bonds.forEach(([a, b, order]) => {
      const pa = positions[a]
      const pb = positions[b]
      const offsets = this.bondOffsets(pa, pb, order, neighbors[a].find((n) => n !== b) ?? neighbors[b].find((n) => n !== a), positions)
      const radius = order > 1 ? MULTI_BOND_RADIUS : BOND_RADIUS
      for (const off of offsets) {
        const start = pa.clone().add(off)
        const end = pb.clone().add(off)
        const mid = start.clone().lerp(end, 0.5)
        this.root.add(this.cylinderBetween(cylinder, start, mid, radius, data.atoms[a][0]))
        this.root.add(this.cylinderBetween(cylinder, mid, end, radius, data.atoms[b][0]))
      }
    })

    // Frame the camera so the molecule fills the view. (0.78: a bounding sphere is larger than
    // the molecule's visible outline, so we can move in closer than the sphere suggests.)
    const radius = new THREE.Box3().setFromObject(this.root).getBoundingSphere(new THREE.Sphere()).radius
    const distance = radius / Math.sin(THREE.MathUtils.degToRad(this.camera.fov / 2)) * 0.78
    this.camera.position.set(0, radius * 0.15, distance)
    this.controls.minDistance = distance * 0.4
    this.controls.maxDistance = distance * 2.5
    this.controls.target.set(0, 0, 0)
    this.controls.update()
    this.needsRender = true
  }

  /** Clean up GPU memory and listeners. Always call when the component disappears. */
  dispose() {
    this.disposed = true
    cancelAnimationFrame(this.frameId)
    this.resizeObserver.disconnect()
    this.visibilityObserver.disconnect()
    this.renderer.domElement.removeEventListener('pointermove', this.handlePointerMove)
    this.renderer.domElement.removeEventListener('pointerleave', this.handlePointerLeave)
    this.clearMolecule()
    this.materials.forEach((m) => m.dispose())
    this.scene.environment?.dispose()
    this.controls.dispose()
    this.renderer.dispose()
    this.renderer.domElement.remove()
  }

  // ---------------------------------------------------------------- internals

  /** One shared material per element (reusing materials is much faster). */
  private materialFor(element: string) {
    let m = this.materials.get(element)
    if (!m) {
      m = new THREE.MeshPhysicalMaterial({
        color: elementStyle(element).color,
        roughness: 0.32,
        metalness: 0.0,
        clearcoat: 0.55, // thin glossy top layer, like a polished model
        clearcoatRoughness: 0.18,
      })
      this.materials.set(element, m)
    }
    return m
  }

  /** A cylinder from point a to point b. Cylinders are created upright (y-axis), so we rotate them. */
  private cylinderBetween(geo: THREE.CylinderGeometry, a: THREE.Vector3, b: THREE.Vector3, r: number, element: string) {
    const mesh = new THREE.Mesh(geo, this.materialFor(element))
    const dir = b.clone().sub(a)
    mesh.scale.set(r, dir.length(), r)
    mesh.position.copy(a).addScaledVector(dir, 0.5)
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize())
    return mesh
  }

  /**
   * Single bonds sit on the atom-atom axis. Double/triple bonds are drawn as parallel
   * cylinders, offset sideways within the plane of a neighboring atom, which is how
   * chemists draw them in models.
   */
  private bondOffsets(pa: THREE.Vector3, pb: THREE.Vector3, order: number, neighbor: number | undefined, positions: THREE.Vector3[]) {
    if (order <= 1) return [new THREE.Vector3()]
    const axis = pb.clone().sub(pa).normalize()
    const ref = neighbor !== undefined ? positions[neighbor].clone().sub(pa) : new THREE.Vector3(0, 0, 1)
    let side = ref.sub(axis.clone().multiplyScalar(ref.dot(axis))) // part of ref perpendicular to the bond
    if (side.lengthSq() < 1e-6) side = new THREE.Vector3(1, 0, 0).cross(axis)
    side.normalize()
    if (order === 2) return [side.clone().multiplyScalar(MULTI_BOND_OFFSET), side.clone().multiplyScalar(-MULTI_BOND_OFFSET)]
    return [new THREE.Vector3(), side.clone().multiplyScalar(MULTI_BOND_OFFSET * 1.6), side.clone().multiplyScalar(-MULTI_BOND_OFFSET * 1.6)]
  }

  private clearMolecule() {
    this.root.traverse((o) => {
      if (o instanceof THREE.Mesh) o.geometry.dispose()
    })
    this.root.clear()
    this.atomMeshes = []
    this.hovered = null
  }

  private resize() {
    const { clientWidth: w, clientHeight: h } = this.container
    if (w === 0 || h === 0) return
    this.renderer.setSize(w, h, false)
    this.renderer.domElement.style.width = '100%'
    this.renderer.domElement.style.height = '100%'
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
    this.needsRender = true
  }

  private handlePointerMove = (e: PointerEvent) => {
    const rect = this.renderer.domElement.getBoundingClientRect()
    this.pointer.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1)
    this.pointerInside = true
    this.pointerDirty = true
  }

  private handlePointerLeave = () => {
    this.pointerInside = false
    this.pointerDirty = true
  }

  /** Find the atom under the mouse and highlight it by scaling it up slightly. */
  private updateHover() {
    // PERFORMANCE: only ray-cast when the mouse moved, or when the model turned under a still mouse.
    if (!this.pointerDirty && !(this.pointerInside && this.needsRender)) return
    this.pointerDirty = false
    let hit: THREE.Mesh | null = null
    if (this.pointerInside) {
      this.raycaster.setFromCamera(this.pointer, this.camera)
      hit = (this.raycaster.intersectObjects(this.atomMeshes, false)[0]?.object as THREE.Mesh) ?? null
    }
    if (hit === this.hovered) return
    this.needsRender = true

    if (this.hovered) this.hovered.scale.divideScalar(1.18)
    this.hovered = hit
    if (hit) hit.scale.multiplyScalar(1.18)
    this.renderer.domElement.style.cursor = hit ? 'pointer' : 'grab'

    const { index, element } = (hit?.userData ?? {}) as { index?: number; element?: string }
    this.options.onHover?.(
      hit && index !== undefined && element
        ? { index, element, elementName: elementStyle(element).name, bondCount: this.bondCounts[index] }
        : null,
    )
  }

  /**
   * The render loop. It is called every animation frame, but only DRAWS when needed:
   *   • while the user drags: every frame (smooth),
   *   • while gently auto-rotating: at most 30 frames per second (looks the same, half the work),
   *   • when nothing changed: not at all.
   */
  private animate = () => {
    if (this.disposed) return
    this.frameId = requestAnimationFrame(this.animate)
    this.timer.update()
    const delta = this.timer.getDelta() // seconds since last frame
    if (!this.isVisible) return
    // Passing real elapsed time keeps the spin speed the same on 60 Hz and 120 Hz screens.
    this.controls.update(delta)
    if (this.controls.autoRotate) this.needsRender = true
    this.updateHover()
    if (!this.needsRender) return
    const now = performance.now()
    if (!this.interacting && now - this.lastRender < 1000 / 30) return
    this.lastRender = now
    this.needsRender = false
    this.renderer.render(this.scene, this.camera)
    countFrame('hero')
  }
}
