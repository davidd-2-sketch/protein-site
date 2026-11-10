/*
  TrendsScene.ts — the periodic table as a 3D "skyline".

  Every element sits on a tile in its usual place in the table. For each property
  being shown, a column rises from the tile; its height is the element's value.
  A trend looks like a slope, and an exception looks like a dip.

    • One property  → one wide column per element.
    • Two to four   → narrower columns side by side on each tile, one color per property.
    • Flat mode     → columns collapse to thin slabs, and brightness shows the value instead.

  PERFORMANCE: all 118 tiles are drawn in one draw call, and all columns in another
  ("instancing": one shape, many copies). Built on Stage3D, so it redraws only while
  something is changing.
*/
import * as THREE from 'three'
import { Stage3D } from '../three/Stage3D'
import { ELEMENTS, propInfo, type PropId } from './elements'

const N = ELEMENTS.length
const SLOTS = 4 // up to four properties per element
const CELL = 1 // one table cell is 1 unit wide
const MAX_HEIGHT = 4.2
const FLAT_HEIGHT = 0.07
const TILE_HEIGHT = 0.08

export interface TrendsView {
  props: PropId[]
  flat: boolean
  /** Atomic numbers to emphasize. Everything else is dimmed and flattened. Empty = all. */
  focus: number[]
  selected: number | null
}

/* Where each element sits (table centered on the origin). */
const centerX = 9.5
const centerZ = 5.2
const POS = ELEMENTS.map((e) => new THREE.Vector3((e.col - centerX) * CELL, 0, (e.row - centerZ) * CELL))

/** Sub-positions on a tile for k columns: [x offset, z offset, width, depth]. */
function layout(k: number): [number, number, number, number][] {
  if (k <= 1) return [[0, 0, 0.84, 0.84]]
  if (k === 2) return [[-0.22, 0, 0.4, 0.84], [0.22, 0, 0.4, 0.84]]
  return [[-0.22, -0.22, 0.4, 0.4], [0.22, -0.22, 0.4, 0.4], [-0.22, 0.22, 0.4, 0.4], [0.22, 0.22, 0.4, 0.4]].slice(0, k) as [number, number, number, number][]
}

export class TrendsScene {
  readonly stage: Stage3D
  private tiles: THREE.InstancedMesh
  private bars: THREE.InstancedMesh
  private view: TrendsView = { props: [], flat: false, focus: [], selected: null }
  /** Current and target height of every column (animated toward the target). */
  private height = new Float32Array(N * SLOTS)
  private target = new Float32Array(N * SLOTS)
  private labelPos = ELEMENTS.map(() => new THREE.Vector3())
  private dimmed = new Uint8Array(N)
  private raycaster = new THREE.Raycaster()
  private pointer = new THREE.Vector2()
  private down = { x: 0, y: 0 }
  private hovered: number | null = null
  private onPick: (z: number) => void
  private onHover: (z: number | null) => void
  private dummy = new THREE.Object3D()
  private color = new THREE.Color()

  constructor(container: HTMLElement, onPick: (z: number) => void, onHover: (z: number | null) => void) {
    this.onPick = onPick
    this.onHover = onHover
    this.stage = new Stage3D(container, 'trends')

    const box = new THREE.BoxGeometry(1, 1, 1)
    box.translate(0, 0.5, 0) // so a column grows upward from its base
    this.tiles = new THREE.InstancedMesh(box, new THREE.MeshStandardMaterial({ roughness: 0.7 }), N)
    this.bars = new THREE.InstancedMesh(box, new THREE.MeshStandardMaterial({ roughness: 0.45 }), N * SLOTS)
    this.bars.frustumCulled = false
    this.tiles.frustumCulled = false
    this.stage.scene.add(this.tiles, this.bars)

    const el = this.stage.renderer.domElement
    el.addEventListener('pointerdown', (e) => (this.down = { x: e.clientX, y: e.clientY }))
    el.addEventListener('pointerup', this.handleUp)
    el.addEventListener('pointermove', this.handleMove)
    el.addEventListener('pointerleave', () => this.setHover(null))

    this.stage.onBeforeRender(() => this.animate())
    this.setCamera(false)
    this.apply(true)
    // Development only: lets automated tests inspect the scene.
    if (import.meta.env.DEV) (window as unknown as { __trends: TrendsScene }).__trends = this
  }

  setView(next: TrendsView) {
    const flatChanged = next.flat !== this.view.flat
    this.view = next
    if (flatChanged) this.setCamera(next.flat)
    this.apply(false)
  }

  /** Look at the table from the front and above (3D), or straight down (flat). */
  setCamera(flat: boolean) {
    // 3D: a fairly steep angle, so tall columns in front don't hide the rows behind them.
    this.stage.lookFrom(flat ? new THREE.Vector3(0, 1, 0.02) : new THREE.Vector3(0.14, 1.3, 1), flat ? 7.6 : 8.2)
  }

  /** Where to draw each element's symbol: the top of its tallest column. */
  labels() {
    return ELEMENTS.map((e, i) => ({ text: e.symbol, position: this.labelPos[i], dim: this.dimmed[i] === 1 }))
  }

  dispose() {
    this.stage.dispose()
  }

  /* ----------------------------------------------------------- internals */

  /** Work out every column's target height and color for the current view. */
  private apply(instant: boolean) {
    const { props, flat, focus, selected } = this.view
    const focusSet = new Set(focus)
    const slots = layout(props.length)

    ELEMENTS.forEach((e, i) => {
      const dim = focusSet.size > 0 && !focusSet.has(e.z)
      this.dimmed[i] = dim ? 1 : 0

      // Tile: slightly lighter for main-group elements, highlighted when selected.
      this.color.set(e.z === selected ? '#ffffff' : dim ? '#12142c' : '#262a52')
      this.tiles.setColorAt(i, this.color)
      this.dummy.position.copy(POS[i])
      this.dummy.scale.set(0.94, TILE_HEIGHT, 0.94)
      this.dummy.updateMatrix()
      this.tiles.setMatrixAt(i, this.dummy.matrix)

      for (let s = 0; s < SLOTS; s++) {
        const id = props[s]
        const value = id ? e.values[id] : null
        const index = i * SLOTS + s
        if (!id || value === null || !slots[s]) {
          this.target[index] = 0
          continue
        }
        const t = value / propInfo(id).max // 0 → 1
        this.target[index] = flat || dim ? FLAT_HEIGHT : Math.max(FLAT_HEIGHT, t * MAX_HEIGHT)
        // Brightness also follows the value, so flat mode still shows the trend.
        this.color.set(propInfo(id).color).multiplyScalar(dim ? 0.16 : 0.22 + 0.78 * t)
        this.bars.setColorAt(index, this.color)
      }
    })
    if (instant) this.height.set(this.target)
    this.tiles.instanceMatrix.needsUpdate = true
    if (this.tiles.instanceColor) this.tiles.instanceColor.needsUpdate = true
    if (this.bars.instanceColor) this.bars.instanceColor.needsUpdate = true
    this.place()
    this.stage.requestRender()
  }

  /** Ease every column toward its target height. Returns true while anything is still moving. */
  private animate() {
    let moving = false
    for (let i = 0; i < this.height.length; i++) {
      const d = this.target[i] - this.height[i]
      if (Math.abs(d) > 0.002) {
        this.height[i] += d * 0.18
        moving = true
      } else this.height[i] = this.target[i]
    }
    if (moving) this.place()
    return moving
  }

  /** Write every column's position and size to the graphics card. */
  private place() {
    const slots = layout(this.view.props.length)
    for (let i = 0; i < N; i++) {
      let tallest = 0
      for (let s = 0; s < SLOTS; s++) {
        const h = this.height[i * SLOTS + s]
        const slot = slots[s]
        if (!slot || h <= 0.001) {
          // Hidden: shrunk to a speck inside the tile. (Not zero: a zero-size shape breaks click detection.)
          this.dummy.position.set(POS[i].x, 0.02, POS[i].z)
          this.dummy.scale.setScalar(0.001)
        } else {
          this.dummy.position.set(POS[i].x + slot[0], TILE_HEIGHT, POS[i].z + slot[1])
          this.dummy.scale.set(slot[2], h, slot[3])
          tallest = Math.max(tallest, h)
        }
        this.dummy.updateMatrix()
        this.bars.setMatrixAt(i * SLOTS + s, this.dummy.matrix)
      }
      this.labelPos[i].set(POS[i].x, TILE_HEIGHT + tallest + 0.02, POS[i].z)
    }
    this.bars.instanceMatrix.needsUpdate = true
    // The columns changed size, so three.js must re-measure them before the next click test.
    this.bars.boundingSphere = null
    this.bars.boundingBox = null
  }

  /** Which element is under the mouse? (Checks columns first, then tiles.) */
  private elementAt(e: PointerEvent): number | null {
    const r = this.stage.renderer.domElement.getBoundingClientRect()
    this.pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1)
    this.raycaster.setFromCamera(this.pointer, this.stage.camera)
    const hit = this.raycaster.intersectObjects([this.bars, this.tiles], false)[0]
    if (!hit || hit.instanceId === undefined) return null
    const i = hit.object === this.bars ? Math.floor(hit.instanceId / SLOTS) : hit.instanceId
    return ELEMENTS[i].z
  }

  private handleUp = (e: PointerEvent) => {
    // A click, not a drag: the mouse barely moved between press and release.
    if (Math.hypot(e.clientX - this.down.x, e.clientY - this.down.y) > 5) return
    const z = this.elementAt(e)
    if (z !== null) this.onPick(z)
  }

  private handleMove = (e: PointerEvent) => {
    if (e.buttons) return // dragging to rotate: skip hover checks
    this.setHover(this.elementAt(e))
  }

  private setHover(z: number | null) {
    if (z === this.hovered) return
    this.hovered = z
    this.stage.renderer.domElement.style.cursor = z === null ? 'grab' : 'pointer'
    this.onHover(z)
  }
}
