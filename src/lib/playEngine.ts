import type { CandidatePath, FieldPoint, FrameAnalysis, PlayFrame, PlayerState } from '../types'

export function distance(a: FieldPoint, b: FieldPoint) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

export function findPlayer(frame: PlayFrame, playerId: string) {
  return frame.players.find((player) => player.id === playerId)
}

export function interpolateFrames(frames: PlayFrame[], time: number): PlayFrame {
  if (time <= frames[0].time) return frames[0]
  if (time >= frames[frames.length - 1].time) return frames[frames.length - 1]

  const upperIndex = frames.findIndex((frame) => frame.time >= time)
  const lower = frames[upperIndex - 1]
  const upper = frames[upperIndex]
  const ratio = (time - lower.time) / (upper.time - lower.time)

  return {
    time,
    players: lower.players.map((player) => {
      const next = upper.players.find((candidate) => candidate.id === player.id) ?? player
      return {
        ...player,
        x: player.x + (next.x - player.x) * ratio,
        y: player.y + (next.y - player.y) * ratio,
        vx: player.vx + (next.vx - player.vx) * ratio,
        vy: player.vy + (next.vy - player.vy) * ratio,
      }
    }),
  }
}

function curve(start: FieldPoint, lateral: number, forward = 12): FieldPoint[] {
  return [
    start,
    { x: start.x + 2.5, y: start.y + lateral * 0.24 },
    { x: start.x + 6, y: start.y + lateral * 0.68 },
    { x: start.x + forward, y: Math.max(1, Math.min(52.3, start.y + lateral)) },
  ]
}

function projectedPlayer(player: PlayerState, time: number) {
  return {
    x: player.x + player.vx * time,
    y: player.y + player.vy * time,
  }
}

function threatEvaluation(path: FieldPoint[], defenders: PlayerState[], blockers: PlayerState[]) {
  let minimum = Number.POSITIVE_INFINITY
  let rawMinimum = Number.POSITIVE_INFINITY
  let defenderId: string | undefined
  let blockHelpTotal = 0
  path.forEach((point, pointIndex) => {
    const arrivalTime = pointIndex * 0.48
    defenders.forEach((defender) => {
      const projected = projectedPlayer(defender, arrivalTime)
      const rawGap = distance(point, projected)
      const blockerDistance = blockers.reduce((nearest, blocker) => {
        const blockerSpot = projectedPlayer(blocker, arrivalTime)
        return Math.min(nearest, distance(projected, blockerSpot))
      }, Number.POSITIVE_INFINITY)
      const blockHelp = Math.max(0, Math.min(1, (2.1 - blockerDistance) / 1.6))
      const effectiveGap = rawGap + blockHelp * 2.8
      blockHelpTotal += blockHelp
      rawMinimum = Math.min(rawMinimum, rawGap)
      if (effectiveGap < minimum) {
        minimum = effectiveGap
        defenderId = defender.id
      }
    })
  })
  return {
    minimum,
    rawMinimum,
    defenderId,
    blockHelp: Math.min(1, blockHelpTotal / Math.max(1, path.length * 1.8)),
  }
}

function scorePath(id: string, label: string, points: FieldPoint[], defenders: PlayerState[], blockers: PlayerState[]): CandidatePath {
  const threat = threatEvaluation(points.slice(1), defenders, blockers)
  const forwardYards = points[points.length - 1].x - points[0].x
  const collisionRisk = Math.max(0, 1 - threat.minimum / 8)
  const rawRisk = Math.max(0, 1 - threat.rawMinimum / 8)
  const cutCost = Math.abs(points[points.length - 1].y - points[0].y) * 0.08
  const expectedYards = Math.max(0, forwardYards * (1 - collisionRisk * .62))
  const score = expectedYards - cutCost + threat.blockHelp * .7
  return { id, label, points, score, expectedYards, risk: collisionRisk, rawRisk, blockHelp: threat.blockHelp, cutCost }
}

export function analyzeFrame(frame: PlayFrame, ballCarrierId: string): FrameAnalysis {
  const runner = findPlayer(frame, ballCarrierId)
  if (!runner) throw new Error(`Ball carrier ${ballCarrierId} is missing from frame`)
  const defenders = frame.players.filter((player) => player.side === 'defense')
  const blockers = frame.players.filter((player) => player.side === 'offense' && player.id !== ballCarrierId)
  const paths = [
    scorePath('left', 'Bounce left', curve(runner, -10), defenders, blockers),
    scorePath('inside', 'Press inside', curve(runner, 0), defenders, blockers),
    scorePath('right', 'Bounce right', curve(runner, 10), defenders, blockers),
  ].sort((a, b) => b.score - a.score)

  const best = paths[0]
  const threat = threatEvaluation(best.points, defenders, blockers)
  const margin = best.score - paths[1].score
  const confidence = Math.round(Math.max(51, Math.min(92, 64 + margin * 4)))
  const boxCount = defenders.filter((defender) => Math.abs(defender.x - runner.x) <= 9 && Math.abs(defender.y - runner.y) <= 12).length
  const reason = best.id === 'inside'
    ? 'The interior lane reaches open space sooner and asks for the least lateral movement.'
    : `The ${best.id} edge has the slowest projected defender arrival and the cleanest path into the second level.`

  return {
    recommended: best,
    alternatives: paths.slice(1),
    confidence,
    explanation: `${reason} Nearby blockers reduce the modeled danger from ${Math.round(best.rawRisk * 100)}% to ${Math.round(best.risk * 100)}%.`,
    primaryThreatId: threat.defenderId,
    boxCount,
    rationale: [
      {
        label: 'Defender arrival',
        value: `${threat.minimum.toFixed(1)} yd cushion`,
        detail: threat.defenderId ? `The nearest projected threat is jersey ${defenders.find((defender) => defender.id === threat.defenderId)?.jersey ?? threat.defenderId}.` : 'No immediate defender controls the lane.',
        tone: threat.minimum >= 4 ? 'positive' : 'warning',
      },
      {
        label: 'Blocking influence',
        value: `${Math.round(best.blockHelp * 100)}% help`,
        detail: 'Proximity and leverage from nearby offensive players reduce defender influence; a block is never treated as guaranteed.',
        tone: best.blockHelp >= .25 ? 'positive' : 'neutral',
      },
      {
        label: 'Decision separation',
        value: `+${margin.toFixed(1)} vs next`,
        detail: margin < .35 ? 'The top two options are effectively a toss-up at this moment.' : 'The preferred path has a meaningful advantage over the next option.',
        tone: margin >= .7 ? 'positive' : 'neutral',
      },
      {
        label: 'Movement cost',
        value: `${best.cutCost.toFixed(1)} cut cost`,
        detail: best.cutCost > .6 ? 'This path needs a sharper lateral commitment.' : 'The runner can stay relatively square and get vertical quickly.',
        tone: best.cutCost > .6 ? 'warning' : 'positive',
      },
    ],
  }
}

export function pathToSvg(points: FieldPoint[], project: (point: FieldPoint) => FieldPoint) {
  return points.map((point, index) => {
    const projected = project(point)
    return `${index === 0 ? 'M' : 'L'} ${projected.x.toFixed(2)} ${projected.y.toFixed(2)}`
  }).join(' ')
}
