/*
  quality3d.ts — Three.js setup that follows the device's graphics profile (perf/quality.ts).
  Every 3D view creates its renderer, lights, glossy materials, and spheres through these,
  so the "fast" profile is applied everywhere at once.
*/
import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { frameWatcher, settings } from '../perf/quality'

/** A material for atoms, bonds, and surfaces: physically based when detailed, Phong when fast. */
export type GlossyMaterial = THREE.MeshPhysicalMaterial | THREE.MeshPhongMaterial

export function createRenderer(container: HTMLElement) {
  const q = settings()
  const renderer = new THREE.WebGLRenderer({
    antialias: q.antialias,
    alpha: true,
    // 'default' lets laptops with two graphics chips stay on the cooler, battery-friendly one.
    powerPreference: 'default',
  })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, q.maxPixelRatio))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.NeutralToneMapping
  renderer.domElement.style.display = 'block'
  container.appendChild(renderer.domElement)
  return renderer
}

/**
 * Key light (upper left) + cool rim light (behind). Detailed: plus soft reflections from a
 * virtual room. Fast: a sky/ground light instead, which costs nothing per frame.
 */
export function addLighting(scene: THREE.Scene, renderer: THREE.WebGLRenderer, rim = 1.2) {
  const key = new THREE.DirectionalLight('#ffffff', 2.2)
  key.position.set(-4, 6, 8)
  const rimLight = new THREE.DirectionalLight('#8fe9ff', rim)
  rimLight.position.set(6, -2, -8)
  scene.add(key, rimLight)
  if (settings().reflections) {
    const pmrem = new THREE.PMREMGenerator(renderer)
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    scene.environmentIntensity = 0.55
    pmrem.dispose()
    scene.add(new THREE.AmbientLight('#ffffff', 0.15))
  } else {
    scene.add(new THREE.HemisphereLight('#e4e9ff', '#20244a', 1.6), new THREE.AmbientLight('#ffffff', 0.25))
  }
}

/** Glossy material. `opts` are the physically based settings used in the detailed profile. */
export function glossy(opts: THREE.MeshPhysicalMaterialParameters): GlossyMaterial {
  if (!settings().fast) return new THREE.MeshPhysicalMaterial(opts)
  // Phong: one cheap highlight per light. Keeps the shared settings (color, transparency, clipping).
  const { roughness, clearcoat, clearcoatRoughness, metalness, ...shared } = opts
  void roughness
  void clearcoat
  void clearcoatRoughness
  void metalness
  return new THREE.MeshPhongMaterial({ ...(shared as THREE.MeshPhongMaterialParameters), shininess: 60, specular: new THREE.Color('#40465f') })
}

/** A unit sphere with the profile's level of detail. */
export function sphereGeometry(radius = 1, detail = 1) {
  const [w, h] = settings().sphere
  return new THREE.SphereGeometry(radius, Math.max(8, Math.round(w * detail)), Math.max(6, Math.round(h * detail)))
}

/**
 * Watches how fast a view draws. If it is too slow on Auto, drop this renderer to 1× pixels
 * immediately (future views will open in the fast profile).
 */
export function watchRenderer(renderer: THREE.WebGLRenderer, onChange?: () => void) {
  return frameWatcher(() => {
    renderer.setPixelRatio(1)
    onChange?.()
  })
}
