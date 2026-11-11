/*
  Stage3D.ts — the shared "3D stage" for every Three.js view on the site.

  It sets up, once and the same way everywhere:
    • a sharp renderer (pixel density capped at 1.5× for performance),
    • soft studio lighting + reflections (so atoms look glossy and real),
    • a camera you can drag to rotate and scroll to zoom,
    • RENDER ON DEMAND: it only redraws when something calls requestRender()
      or the camera moves. A still scene costs almost nothing.

  New 3D modules (VSEPR, orbitals, ...) build on this instead of repeating setup code.
*/
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { countFrame } from '../dev/frameCounter'
import { addLighting, createRenderer, watchRenderer } from './quality3d'

export class Stage3D {
  readonly scene = new THREE.Scene()
  readonly camera = new THREE.PerspectiveCamera(32, 1, 0.1, 200)
  readonly renderer: THREE.WebGLRenderer
  readonly controls: OrbitControls
  private container: HTMLElement
  private resizeObserver: ResizeObserver
  private needsRender = true
  private frameId = 0
  private disposed = false
  private beforeRender: ((dt: number) => boolean | void)[] = []
  private afterRender: (() => void)[] = []
  private timer = new THREE.Timer()
  private fitRadius = 3
  private defaultDirection = new THREE.Vector3(0.35, 0.3, 1).normalize()

  private name: string
  private watcher: ReturnType<typeof watchRenderer>

  constructor(container: HTMLElement, name = 'stage') {
    this.container = container
    this.name = name
    // Renderer and lights follow the device's graphics profile (fast or detailed).
    this.renderer = createRenderer(container)
    addLighting(this.scene, this.renderer)
    this.watcher = watchRenderer(this.renderer, () => this.requestRender())

    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.08
    this.controls.enablePan = false
    this.controls.addEventListener('change', () => this.requestRender())

    this.resizeObserver = new ResizeObserver(() => this.resize())
    this.resizeObserver.observe(container)
    this.resize()
    this.loop()
  }

  /** Ask for one redraw on the next frame. Cheap to call many times. */
  requestRender() {
    this.needsRender = true
  }

  /**
   * Run `fn` before each frame. If it returns true, another frame is requested
   * (use this for animations; return false/nothing when the animation is done).
   */
  onBeforeRender(fn: (dt: number) => boolean | void) {
    this.beforeRender.push(fn)
  }

  /** Run `fn` after each redraw (e.g. to move HTML labels). Returns an unsubscribe function. */
  onAfterRender(fn: () => void) {
    this.afterRender.push(fn)
    return () => {
      this.afterRender = this.afterRender.filter((f) => f !== fn)
    }
  }

  /** Screen position (CSS pixels from the canvas's top-left) of a 3D point. */
  project(p: THREE.Vector3) {
    const v = p.clone().project(this.camera)
    const { clientWidth: w, clientHeight: h } = this.container
    return { x: ((v.x + 1) / 2) * w, y: ((1 - v.y) / 2) * h, behind: v.z > 1 }
  }

  /** Frame a sphere of this radius around the origin, keeping the current viewing direction. */
  fit(radius: number, resetDirection = false) {
    this.fitRadius = radius
    const vFov = THREE.MathUtils.degToRad(this.camera.fov / 2)
    const hFov = Math.atan(Math.tan(vFov) * this.camera.aspect)
    const dist = (radius / Math.sin(Math.min(vFov, hFov))) * 1.05
    const dir = resetDirection
      ? this.defaultDirection.clone()
      : this.camera.position.clone().sub(this.controls.target).normalize()
    this.controls.target.set(0, 0, 0)
    this.camera.position.copy(dir.multiplyScalar(dist))
    this.controls.minDistance = dist * 0.4
    this.controls.maxDistance = dist * 3
    this.controls.update()
    this.requestRender()
  }

  /** Point the camera at the origin from a given direction, framing a sphere of `radius`. */
  lookFrom(direction: THREE.Vector3, radius: number) {
    this.camera.position.copy(direction.clone().normalize())
    this.controls.target.set(0, 0, 0)
    this.fit(radius)
  }

  setAutoRotate(on: boolean) {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    this.controls.autoRotate = on && !reduced
    this.controls.autoRotateSpeed = 1.2
    this.requestRender()
  }

  dispose() {
    this.disposed = true
    cancelAnimationFrame(this.frameId)
    this.resizeObserver.disconnect()
    this.scene.traverse((o) => {
      if (o instanceof THREE.Mesh || o instanceof THREE.Line) o.geometry.dispose()
    })
    this.scene.environment?.dispose()
    this.controls.dispose()
    this.renderer.dispose()
    this.renderer.domElement.remove()
  }

  private resize() {
    const { clientWidth: w, clientHeight: h } = this.container
    if (!w || !h) return
    this.renderer.setSize(w, h, false)
    this.renderer.domElement.style.width = '100%'
    this.renderer.domElement.style.height = '100%'
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
    this.fit(this.fitRadius)
  }

  private loop = () => {
    if (this.disposed) return
    this.frameId = requestAnimationFrame(this.loop)
    this.timer.update()
    const dt = this.timer.getDelta()
    this.controls.update(dt)
    if (this.controls.autoRotate) this.needsRender = true
    for (const fn of this.beforeRender) if (fn(dt)) this.needsRender = true
    if (!this.needsRender) return
    this.needsRender = false
    this.renderer.render(this.scene, this.camera)
    this.watcher.frame(performance.now())
    countFrame(this.name)
    this.afterRender.forEach((fn) => fn())
  }
}
