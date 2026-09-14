import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { getUniform, type UniformPalette } from '../data/uniforms'
import type { CandidatePath, FieldPoint, PlayFrame, PlayerState } from '../types'

interface ThreePlayViewProps {
  frame: PlayFrame
  cameraView: 'coach' | 'rb'
  ballCarrierId: string
  lineOfScrimmage: number
  offenseTeam: string
  defenseTeam: string
  recommendedPath: CandidatePath
  actualPath: FieldPoint[]
  showAi: boolean
  showThreat: boolean
  primaryThreatId?: string
}

interface AthleteRig {
  root: THREE.Group
  pose: THREE.Group
  torso: THREE.Group
  leftArm: THREE.Group
  rightArm: THREE.Group
  leftLeg: THREE.Group
  rightLeg: THREE.Group
  ball: THREE.Mesh
  uniformKey: string
  jersey: string
}

interface SceneRuntime {
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  renderer: THREE.WebGLRenderer
  athletes: Map<string, AthleteRig>
  threatMarkers: Map<string, THREE.Mesh>
  routeGroup: THREE.Group
  clock: THREE.Clock
  resizeObserver: ResizeObserver
  animationFrame: number
  routeKey: string
  lastPlayTime: number
  lookTarget: THREE.Vector3
}

const fieldToWorld = (point: FieldPoint, lineOfScrimmage: number) =>
  new THREE.Vector3(point.y - 26.65, 0, -(point.x - lineOfScrimmage))

function colorMaterial(color: string, roughness = .72, metalness = .05) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness })
}

function makeNumberTexture(number: string, color: string) {
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 128
  const context = canvas.getContext('2d')!
  context.clearRect(0, 0, 128, 128)
  context.fillStyle = color
  context.font = '900 68px system-ui, sans-serif'
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.strokeStyle = 'rgba(0,0,0,.28)'
  context.lineWidth = 5
  context.strokeText(number, 64, 65)
  context.fillText(number, 64, 65)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4
  return texture
}

function capsule(radius: number, length: number, material: THREE.Material) {
  const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(radius, length, 6, 10), material)
  mesh.castShadow = true
  mesh.receiveShadow = true
  return mesh
}

function createAthlete(player: PlayerState, uniform: UniformPalette, uniformKey: string): AthleteRig {
  const root = new THREE.Group()
  const pose = new THREE.Group()
  root.add(pose)

  const jersey = colorMaterial(uniform.primary, .68)
  const trim = colorMaterial(uniform.secondary, .6, .12)
  const helmet = colorMaterial(uniform.helmet, .42, .18)
  const pants = colorMaterial(uniform.pants, .78)
  const skin = colorMaterial('#8a5a3b', .84)
  const dark = colorMaterial('#171b19', .65)
  const isLineman = ['LT', 'LG', 'C', 'RG', 'RT', 'DT'].includes(player.role ?? '')

  const torso = new THREE.Group()
  torso.position.y = isLineman ? 1.26 : 1.3
  const body = capsule(isLineman ? .38 : .33, isLineman ? .62 : .68, jersey)
  body.scale.set(isLineman ? 1.16 : 1, 1, .76)
  torso.add(body)

  const pads = new THREE.Mesh(new THREE.BoxGeometry(isLineman ? 1.02 : .88, .25, .52), jersey)
  pads.position.y = .37
  pads.castShadow = true
  torso.add(pads)

  const leftShoulderStripe = new THREE.Mesh(new THREE.BoxGeometry(.09, .27, .535), trim)
  leftShoulderStripe.position.set(isLineman ? -.43 : -.37, .37, 0)
  const rightShoulderStripe = leftShoulderStripe.clone()
  rightShoulderStripe.position.x *= -1
  torso.add(leftShoulderStripe, rightShoulderStripe)

  const collar = new THREE.Mesh(new THREE.TorusGeometry(.19, .045, 6, 18, Math.PI * 1.45), trim)
  collar.position.set(0, .55, -.17)
  collar.rotation.x = Math.PI / 2
  torso.add(collar)

  const head = new THREE.Mesh(new THREE.SphereGeometry(.255, 14, 10), skin)
  head.position.y = .76
  head.castShadow = true
  torso.add(head)

  const shell = new THREE.Mesh(new THREE.SphereGeometry(.36, 20, 14, 0, Math.PI * 2, 0, Math.PI * .72), helmet)
  shell.position.y = .8
  shell.castShadow = true
  torso.add(shell)

  const helmetStripe = new THREE.Mesh(new THREE.BoxGeometry(.07, .45, .72), trim)
  helmetStripe.position.set(0, .91, 0)
  helmetStripe.rotation.x = -.1
  torso.add(helmetStripe)

  const facemask = new THREE.Group()
  const maskBar = new THREE.Mesh(new THREE.CylinderGeometry(.018, .018, .63, 8), dark)
  maskBar.rotation.z = Math.PI / 2
  facemask.add(maskBar)
  const maskSide = new THREE.Mesh(new THREE.CylinderGeometry(.018, .018, .35, 8), dark)
  maskSide.position.set(.29, -.14, .08)
  maskSide.rotation.x = .25
  facemask.add(maskSide)
  facemask.position.set(0, .74, -.35)
  torso.add(facemask)

  const numberTexture = makeNumberTexture(player.jersey, uniform.number)
  const numberMaterial = new THREE.MeshBasicMaterial({ map: numberTexture, transparent: true, depthWrite: false })
  const numberGeometry = new THREE.PlaneGeometry(.52, .52)
  const backNumber = new THREE.Mesh(numberGeometry, numberMaterial)
  backNumber.position.set(0, .05, .285)
  torso.add(backNumber)
  const frontNumber = backNumber.clone()
  frontNumber.position.z = -.285
  frontNumber.rotation.y = Math.PI
  torso.add(frontNumber)

  const hips = new THREE.Mesh(new THREE.BoxGeometry(.57, .34, .44), pants)
  hips.position.y = .77
  hips.castShadow = true
  pose.add(hips)

  const makeLimb = (material: THREE.Material, radius: number, length: number) => {
    const pivot = new THREE.Group()
    const limb = capsule(radius, length, material)
    limb.position.y = -length / 2 - radius
    pivot.add(limb)
    return pivot
  }

  const leftArm = makeLimb(jersey, .105, .58)
  const rightArm = makeLimb(jersey, .105, .58)
  leftArm.position.set(-.43, 1.51, 0)
  rightArm.position.set(.43, 1.51, 0)
  pose.add(leftArm, rightArm)

  const leftLeg = makeLimb(pants, .13, .7)
  const rightLeg = makeLimb(pants, .13, .7)
  leftLeg.position.set(-.19, .71, 0)
  rightLeg.position.set(.19, .71, 0)
  pose.add(leftLeg, rightLeg)

  const leftShoe = new THREE.Mesh(new THREE.BoxGeometry(.24, .13, .42), dark)
  leftShoe.position.set(-.19, .08, -.11)
  leftShoe.castShadow = true
  const rightShoe = leftShoe.clone()
  rightShoe.position.x = .19
  pose.add(leftShoe, rightShoe)
  pose.add(torso)

  const ball = new THREE.Mesh(new THREE.SphereGeometry(.17, 12, 8), colorMaterial('#6d351d', .82))
  ball.scale.set(.72, 1.12, .72)
  ball.rotation.z = .85
  ball.position.set(.46, 1.2, -.18)
  ball.visible = false
  ball.castShadow = true
  pose.add(ball)

  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(isLineman ? .62 : .5, 24),
    new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: .22, depthWrite: false }),
  )
  shadow.rotation.x = -Math.PI / 2
  shadow.position.y = .012
  shadow.scale.set(1, 1.55, 1)
  root.add(shadow)

  return { root, pose, torso, leftArm, rightArm, leftLeg, rightLeg, ball, uniformKey, jersey: player.jersey }
}

function addField(scene: THREE.Scene) {
  const field = new THREE.Group()
  const stripeColors = ['#1d5c38', '#225f3c']
  for (let index = 0; index < 8; index += 1) {
    const stripe = new THREE.Mesh(
      new THREE.PlaneGeometry(53.3, 10),
      new THREE.MeshStandardMaterial({ color: stripeColors[index % 2], roughness: .98 }),
    )
    stripe.rotation.x = -Math.PI / 2
    stripe.position.set(0, 0, 25 - index * 10)
    stripe.receiveShadow = true
    field.add(stripe)
  }

  const white = new THREE.MeshStandardMaterial({ color: '#f3f6f2', roughness: .9 })
  for (let z = 25; z >= -45; z -= 5) {
    const yardLine = new THREE.Mesh(new THREE.BoxGeometry(53.3, .018, .065), white)
    yardLine.position.set(0, .017, z)
    field.add(yardLine)
    for (const hashX of [-3.08, 3.08]) {
      for (let tick = -4; tick <= 4; tick += 1) {
        const hash = new THREE.Mesh(new THREE.BoxGeometry(.52, .02, .055), white)
        hash.position.set(hashX, .019, z + tick)
        field.add(hash)
      }
    }
  }

  for (const sidelineX of [-26.62, 26.62]) {
    const sideline = new THREE.Mesh(new THREE.BoxGeometry(.11, .025, 80), white)
    sideline.position.set(sidelineX, .02, -10)
    field.add(sideline)
  }

  const borderMaterial = new THREE.MeshStandardMaterial({ color: '#111916', roughness: .95 })
  const leftRunoff = new THREE.Mesh(new THREE.BoxGeometry(14, .04, 90), borderMaterial)
  leftRunoff.position.set(-33.65, -.03, -10)
  leftRunoff.receiveShadow = true
  const rightRunoff = leftRunoff.clone()
  rightRunoff.position.x = 33.65
  field.add(leftRunoff, rightRunoff)

  const standMaterial = new THREE.MeshStandardMaterial({ color: '#202925', roughness: .88 })
  for (const x of [-34.5, 34.5]) {
    for (let level = 0; level < 5; level += 1) {
      const stand = new THREE.Mesh(new THREE.BoxGeometry(5, .8, 88), standMaterial)
      stand.position.set(x + Math.sign(x) * level * 1.4, .35 + level * .65, -10)
      stand.rotation.z = -Math.sign(x) * .18
      stand.receiveShadow = true
      field.add(stand)
    }
  }

  scene.add(field)
}

function addLighting(scene: THREE.Scene) {
  scene.add(new THREE.HemisphereLight('#b9d9ea', '#12321f', 1.55))
  const key = new THREE.DirectionalLight('#fff6dc', 3.4)
  key.position.set(-18, 28, 18)
  key.castShadow = true
  key.shadow.mapSize.set(2048, 2048)
  key.shadow.camera.left = -35
  key.shadow.camera.right = 35
  key.shadow.camera.top = 35
  key.shadow.camera.bottom = -35
  scene.add(key)
  const fill = new THREE.DirectionalLight('#8ac7ff', 1.4)
  fill.position.set(22, 16, -24)
  scene.add(fill)
}

function updateRoute(group: THREE.Group, name: string, points: FieldPoint[], lineOfScrimmage: number, color: string, radius: number, dashed = false) {
  const previous = group.getObjectByName(name)
  if (previous) {
    group.remove(previous)
    if (previous instanceof THREE.Mesh) {
      previous.geometry.dispose()
      const materials = Array.isArray(previous.material) ? previous.material : [previous.material]
      materials.forEach((material) => material.dispose())
    }
  }
  if (points.length < 2) return
  const positions = points.map((point) => {
    const world = fieldToWorld(point, lineOfScrimmage)
    world.y = .09
    return world
  })
  const curve = new THREE.CatmullRomCurve3(positions)
  const material = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: dashed ? .78 : .98,
    depthTest: false,
    depthWrite: false,
  })
  const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 32, radius, 7, false), material)
  mesh.name = name
  mesh.renderOrder = 10
  group.add(mesh)
}

function nearestOpponent(player: PlayerState, players: PlayerState[]) {
  let nearest = Number.POSITIVE_INFINITY
  players.forEach((candidate) => {
    if (candidate.side === player.side) return
    nearest = Math.min(nearest, Math.hypot(player.x - candidate.x, player.y - candidate.y))
  })
  return nearest
}

export function ThreePlayView(props: ThreePlayViewProps) {
  const mountRef = useRef<HTMLDivElement>(null)
  const propsRef = useRef(props)
  const runtimeRef = useRef<SceneRuntime | null>(null)
  const [failed, setFailed] = useState(false)
  propsRef.current = props

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' })
    } catch {
      setFailed(true)
      return
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.05
    mount.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#07110d')
    scene.fog = new THREE.FogExp2('#07110d', .012)
    addField(scene)
    addLighting(scene)

    const camera = new THREE.PerspectiveCamera(48, 1, .08, 180)
    camera.position.set(0, 9, 19)
    const routeGroup = new THREE.Group()
    scene.add(routeGroup)

    const resize = () => {
      const width = Math.max(1, mount.clientWidth)
      const height = Math.max(1, mount.clientHeight)
      renderer.setSize(width, height, false)
      camera.aspect = width / height
      camera.updateProjectionMatrix()
    }
    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(mount)
    resize()

    const runtime: SceneRuntime = {
      scene,
      camera,
      renderer,
      athletes: new Map(),
      threatMarkers: new Map(),
      routeGroup,
      clock: new THREE.Clock(),
      resizeObserver,
      animationFrame: 0,
      routeKey: '',
      lastPlayTime: -1,
      lookTarget: new THREE.Vector3(0, .72, -9),
    }
    runtimeRef.current = runtime
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const animate = () => {
      const current = propsRef.current
      const delta = Math.min(runtime.clock.getDelta(), .05)
      const timeJump = runtime.lastPlayTime >= 0 && Math.abs(current.frame.time - runtime.lastPlayTime) > .24
      const motionAlpha = timeJump ? 1 : 1 - Math.exp(-20 * delta)
      const offenseUniform = getUniform(current.offenseTeam)
      const defenseUniform = getUniform(current.defenseTeam)
      const validIds = new Set(current.frame.players.map((player) => player.id))

      runtime.athletes.forEach((rig, id) => {
        if (validIds.has(id)) return
        scene.remove(rig.root)
        runtime.athletes.delete(id)
      })

      current.frame.players.forEach((player) => {
        if (current.cameraView === 'rb' && player.id === current.ballCarrierId) {
          const existing = runtime.athletes.get(player.id)
          if (existing) existing.root.visible = false
          return
        }
        const uniform = player.side === 'offense' ? offenseUniform : defenseUniform
        const uniformKey = `${player.side === 'offense' ? current.offenseTeam : current.defenseTeam}-${player.jersey}`
        let rig = runtime.athletes.get(player.id)
        let created = false
        if (!rig || rig.uniformKey !== uniformKey || rig.jersey !== player.jersey) {
          if (rig) scene.remove(rig.root)
          rig = createAthlete(player, uniform, uniformKey)
          runtime.athletes.set(player.id, rig)
          scene.add(rig.root)
          created = true
        }
        rig.root.visible = true
        const world = fieldToWorld(player, current.lineOfScrimmage)
        if (created || timeJump) rig.root.position.copy(world)
        else rig.root.position.lerp(world, motionAlpha)
        const heading = -Math.atan2(player.vy, Math.max(.12, player.vx))
        if (created || timeJump) rig.root.rotation.y = heading
        else {
          const turn = Math.atan2(Math.sin(heading - rig.root.rotation.y), Math.cos(heading - rig.root.rotation.y))
          rig.root.rotation.y += turn * motionAlpha
        }

        const speed = Math.hypot(player.vx, player.vy)
        const phase = player.id.split('').reduce((sum, letter) => sum + letter.charCodeAt(0), 0)
        const stride = reduceMotion ? 0 : Math.sin(current.frame.time * Math.max(7, speed * 3.3) + phase) * Math.min(.72, speed * .105)
        const contactDistance = nearestOpponent(player, current.frame.players)
        const engaged = contactDistance < 1.45 && ['LT', 'LG', 'C', 'RG', 'RT', 'TE', 'DT', 'EDGE'].includes(player.role ?? '')
        const preSnapCrouch = current.frame.time < .22 && ['LT', 'LG', 'C', 'RG', 'RT', 'DT', 'EDGE'].includes(player.role ?? '')
        const runnerContact = player.id === current.ballCarrierId && contactDistance < 1.15
        const crouch = preSnapCrouch ? .52 : engaged ? .28 : runnerContact ? .38 : Math.min(.14, speed * .016)

        rig.pose.rotation.x = crouch
        rig.torso.rotation.x = runnerContact ? -.35 : engaged ? -.18 : -.04 - speed * .012
        rig.leftLeg.rotation.x = engaged ? -.25 : stride
        rig.rightLeg.rotation.x = engaged ? .25 : -stride
        rig.leftLeg.rotation.z = engaged ? .24 : .05
        rig.rightLeg.rotation.z = engaged ? -.24 : -.05
        rig.leftArm.rotation.x = engaged ? -1.15 : -stride * .85
        rig.rightArm.rotation.x = engaged ? -1.15 : stride * .85
        rig.leftArm.rotation.z = engaged ? -.38 : .08
        rig.rightArm.rotation.z = engaged ? .38 : -.08
        rig.ball.visible = player.id === current.ballCarrierId
      })

      runtime.threatMarkers.forEach((marker) => { marker.visible = false })
      if (current.showThreat && current.cameraView === 'coach') {
        current.frame.players.filter((player) => player.side === 'defense').forEach((player) => {
          let marker = runtime.threatMarkers.get(player.id)
          if (!marker) {
            marker = new THREE.Mesh(
              new THREE.RingGeometry(.72, 1.18, 32),
              new THREE.MeshBasicMaterial({ color: '#ff554d', transparent: true, opacity: .38, side: THREE.DoubleSide, depthWrite: false }),
            )
            marker.rotation.x = -Math.PI / 2
            marker.position.y = .04
            runtime.threatMarkers.set(player.id, marker)
            scene.add(marker)
          }
          marker.visible = true
          marker.scale.setScalar(player.id === current.primaryThreatId ? 1.45 : 1)
          const world = fieldToWorld(player, current.lineOfScrimmage)
          marker.position.x = world.x
          marker.position.z = world.z
        })
      }

      const routeTime = (Math.round(current.frame.time * 20) / 20).toFixed(2)
      const routeKey = `${routeTime}-${current.showAi}-${current.actualPath.length}-${current.recommendedPath.id}`
      if (runtime.routeKey !== routeKey) {
        updateRoute(routeGroup, 'actual-route', current.actualPath, current.lineOfScrimmage, '#56a6ff', .085, true)
        updateRoute(routeGroup, 'best-route', current.showAi ? current.recommendedPath.points : [], current.lineOfScrimmage, '#48ed91', .15)
        runtime.routeKey = routeKey
      }

      const runner = current.frame.players.find((player) => player.id === current.ballCarrierId)
      if (current.cameraView === 'rb' && runner) {
        const runnerWorld = fieldToWorld(runner, current.lineOfScrimmage)
        const speed = Math.hypot(runner.vx, runner.vy)
        const forward = new THREE.Vector3(runner.vy, 0, -Math.max(.2, runner.vx)).normalize()
        const side = new THREE.Vector3(-forward.z, 0, forward.x)
        const bob = reduceMotion ? 0 : Math.sin(current.frame.time * Math.max(8, speed * 2.2)) * .045
        const sway = reduceMotion ? 0 : Math.sin(current.frame.time * Math.max(5, speed * 1.35)) * .035
        const targetPosition = runnerWorld.clone().addScaledVector(forward, .08).addScaledVector(side, sway)
        targetPosition.y = 1.72 + bob
        const cameraAlpha = 1 - Math.exp(-11 * delta)
        camera.position.lerp(targetPosition, cameraAlpha)
        camera.fov += (72 - camera.fov) * .18
        const lookTarget = targetPosition.clone().addScaledVector(forward, 13)
        lookTarget.y = 1.35 + bob * .35
        runtime.lookTarget.lerp(lookTarget, cameraAlpha)
        camera.lookAt(runtime.lookTarget)
      } else {
        const targetPosition = new THREE.Vector3(0, 9.2, 20.5)
        const cameraAlpha = 1 - Math.exp(-8 * delta)
        camera.position.lerp(targetPosition, cameraAlpha)
        camera.fov += (47 - camera.fov) * .16
        runtime.lookTarget.lerp(new THREE.Vector3(0, .72, -9), cameraAlpha)
        camera.lookAt(runtime.lookTarget)
      }
      camera.updateProjectionMatrix()
      renderer.render(scene, camera)
      runtime.lastPlayTime = current.frame.time
      runtime.animationFrame = requestAnimationFrame(animate)
    }
    animate()

    return () => {
      cancelAnimationFrame(runtime.animationFrame)
      resizeObserver.disconnect()
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose()
          const materials = Array.isArray(object.material) ? object.material : [object.material]
          materials.forEach((material) => {
            if ('map' in material && material.map instanceof THREE.Texture) material.map.dispose()
            material.dispose()
          })
        }
      })
      renderer.dispose()
      renderer.domElement.remove()
      runtimeRef.current = null
    }
  }, [])

  if (failed) return <div className="three-fallback">3D rendering is unavailable in this browser.</div>
  return <div ref={mountRef} className={`three-play-view ${props.cameraView === 'rb' ? 'helmet-camera' : ''}`} aria-label={props.cameraView === 'rb' ? '3D simulated running back view' : '3D behind the quarterback view'} />
}
