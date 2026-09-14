import type { Play, PlayerState } from '../types'
import { nflTeams } from './teams'

const opponents = ['BUF', 'MIA', 'NYJ', 'BAL', 'DET', 'SF', 'PHI', 'KC']
const concepts = ['Inside zone', 'Outside zone', 'Duo', 'Counter', 'Power', 'Split zone', 'Pin-pull', 'Trap', 'Draw', 'Stretch']

const offenseBase = [
  ['qb', '12', 35, 26.65, 'QB'], ['rb', '33', 31.5, 26.65, 'RB'],
  ['lt', '77', 38.7, 17.3, 'LT'], ['lg', '65', 39, 22, 'LG'], ['c', '60', 39, 26.65, 'C'],
  ['rg', '69', 39, 31.3, 'RG'], ['rt', '71', 38.7, 36, 'RT'], ['te', '87', 38.2, 40.5, 'TE'],
  ['wr1', '18', 39, 5, 'WR'], ['wr2', '11', 39, 48, 'WR'], ['fb', '44', 34, 30, 'FB'],
] as const

const defenseBase = [
  ['d1', '91', 40.7, 16, 'EDGE'], ['d2', '98', 41.2, 22, 'DT'], ['d3', '54', 41, 27.5, 'DT'],
  ['d4', '90', 40.8, 37, 'EDGE'], ['d5', '52', 45.8, 22, 'LB'], ['d6', '55', 46.5, 31, 'LB'],
  ['d7', '23', 46, 41, 'CB'], ['d8', '29', 53, 27, 'S'], ['d9', '21', 46, 7, 'CB'],
  ['d10', '36', 55, 17, 'S'], ['d11', '40', 48, 48, 'CB'],
] as const

function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function makePlayer(
  base: readonly [string, string, number, number, string],
  side: 'offense' | 'defense',
  time: number,
  variant: number,
): PlayerState {
  const [id, jersey, startX, startY, role] = base
  const lateralBias = variant % 3 === 0 ? -1 : variant % 3 === 1 ? 1 : 0
  const runnerMotion = (at: number) => {
    const accelerationTime = Math.min(at, .85)
    const forward = 1.7 * accelerationTime * accelerationTime + Math.max(0, at - .85) * 6.05
    const cutTime = Math.max(0, at - .62)
    const lateral = lateralBias * 7.3 * (1 - Math.exp(-.58 * cutTime))
    return {
      x: 31.5 + forward,
      y: 26.65 + lateral,
      vx: at < .85 ? 3.4 * at : 6.05,
      vy: lateralBias * 4.234 * Math.exp(-.58 * cutTime),
    }
  }

  if (id === 'rb') {
    return { id, jersey, role, side, ...runnerMotion(time) }
  }

  if (id === 'qb') {
    const handoff = Math.min(time, .72)
    const carryOut = Math.max(0, time - .72)
    return {
      id, jersey, role, side,
      x: startX + handoff * 1.25 - carryOut * .35,
      y: startY - lateralBias * carryOut * 1.2,
      vx: time < .72 ? 1.25 : -.35,
      vy: time < .72 ? 0 : -lateralBias * 1.2,
    }
  }

  if (side === 'defense') {
    const runner = runnerMotion(time)
    const frontFlavor = variant % 3
    const isLeftHalf = startY < 26.65
    const isBoxPlayer = ['DT', 'EDGE', 'LB'].includes(role)
    let alignedY = startY
    if (isBoxPlayer && frontFlavor === 0 && isLeftHalf) alignedY += role === 'LB' ? 11.5 : 13
    if (isBoxPlayer && frontFlavor === 1 && !isLeftHalf) alignedY -= role === 'LB' ? 11.5 : 13
    if (isBoxPlayer && frontFlavor === 2 && Math.abs(startY - 26.65) < 8) alignedY += Math.sign(startY - 26.65 || 1) * 7.8
    const readDelay = role === 'DT' || role === 'EDGE' ? .25 : role === 'LB' ? .52 : .82
    const pursuitTime = Math.max(0, time - readDelay)
    const pursuit = 1 - Math.exp(-pursuitTime * (role === 'S' || role === 'CB' ? .48 : .66))
    const penetration = (role === 'DT' ? -.55 : role === 'EDGE' ? -.25 : .12) * Math.min(time, 1.1)
    const initialX = startX + penetration
    const initialY = alignedY + (26.65 - alignedY) * Math.min(time, readDelay) * .04
    const chaseStrength = role === 'S' || role === 'CB' ? .78 : .62
    const x = initialX + (runner.x - initialX) * pursuit * chaseStrength
    const y = initialY + (runner.y - initialY) * pursuit * chaseStrength
    return {
      id, jersey, role, side, x, y,
      vx: pursuitTime > 0 ? (runner.x - x) * .72 : penetration,
      vy: pursuitTime > 0 ? (runner.y - y) * .72 : 0,
    }
  }

  if (role === 'WR') {
    const stem = Math.min(time, 1.35)
    const stalk = Math.max(0, time - 1.35)
    return {
      id, jersey, role, side,
      x: startX + stem * 5.15 + stalk * .9,
      y: startY + Math.sign(26.65 - startY) * stalk * .45,
      vx: time < 1.35 ? 5.15 : .9,
      vy: time < 1.35 ? 0 : Math.sign(26.65 - startY) * .45,
    }
  }

  if (role === 'FB') {
    const lead = runnerMotion(Math.max(0, time + .22))
    return { id, jersey, role, side, x: lead.x + 1.65, y: lead.y - lateralBias * 1.1, vx: lead.vx, vy: lead.vy }
  }

  const playSide = lateralBias === 0 ? (startY < 26.65 ? -1 : 1) : lateralBias
  const isPlaySide = Math.sign(startY - 26.65 || playSide) === playSide
  const engageTime = Math.min(time, 1.45)
  const sustainTime = Math.max(0, time - 1.45)
  const lateralStep = (isPlaySide ? playSide : -playSide * .3) * engageTime * .7
  const forwardStep = engageTime * (isPlaySide ? 1.55 : 1.05) + sustainTime * .38
  return {
    id,
    jersey,
    role,
    side,
    x: startX + forwardStep,
    y: startY + lateralStep,
    vx: time < 1.45 ? (isPlaySide ? 1.55 : 1.05) : .38,
    vy: time < 1.45 ? (isPlaySide ? playSide : -playSide * .3) * .7 : 0,
  }
}

function createDemoPlay(team: string, index: number): Play {
  const seed = team.charCodeAt(0) * 1000 + team.charCodeAt(team.length - 1) * 10 + index
  const random = mulberry32(seed)
  const opponent = opponents.filter((item) => item !== team)[Math.floor(random() * 7)]
  const variant = index + Math.floor(random() * 5)
  const frames = Array.from({ length: 41 }, (_, frameIndex) => {
    const time = frameIndex * 0.1
    return {
      time,
      players: [
        ...offenseBase.map((base) => makePlayer(base, 'offense', time, variant)),
        ...defenseBase.map((base) => makePlayer(base, 'defense', time, variant)),
      ],
    }
  })

  return {
    id: `${team.toLowerCase()}-demo-${String(index + 1).padStart(2, '0')}`,
    team,
    opponent,
    title: concepts[index],
    quarter: (index % 4) + 1,
    clock: `${String(12 - (index % 8)).padStart(2, '0')}:${String(11 + index * 4).slice(-2)}`,
    down: (index % 3) + 1,
    distance: [10, 6, 3, 8][index % 4],
    lineOfScrimmage: 40,
    ballCarrierId: 'rb',
    actualYards: [4, 8, 2, 13, -1, 6, 5, 11, 3, 7][index],
    sourceType: 'simulation',
    frames,
    rights: {
      status: 'demo',
      publicDisplay: true,
      derivativeVisuals: true,
    },
  }
}

export const demoCatalog: Play[] = nflTeams.flatMap((team) =>
  Array.from({ length: 10 }, (_, index) => createDemoPlay(team.id, index)),
)
