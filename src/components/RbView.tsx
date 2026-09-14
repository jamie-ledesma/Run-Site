import type { CSSProperties } from 'react'
import type { CandidatePath, FieldPoint, PlayFrame, PlayerState } from '../types'
import { getUniform, type UniformPalette } from '../data/uniforms'
import { findPlayer } from '../lib/playEngine'

interface RbViewProps {
  frame: PlayFrame
  ballCarrierId: string
  recommendedPath: CandidatePath
  showAi: boolean
  offenseTeam: string
  defenseTeam: string
}

function projectRelative(point: FieldPoint, runner: FieldPoint) {
  const depth = Math.max(-1, point.x - runner.x)
  const lateral = point.y - runner.y
  const perspective = Math.max(0.24, 1 - depth / 32)
  return {
    x: 50 + lateral * (1.9 * perspective),
    y: 53 - depth * 2.2,
    scale: Math.max(0.35, Math.min(1.5, 1.15 - depth * 0.045)),
  }
}

function playerStyle(uniform: UniformPalette) {
  return {
    '--uniform-primary': uniform.primary,
    '--uniform-secondary': uniform.secondary,
    '--uniform-helmet': uniform.helmet,
    '--uniform-number': uniform.number,
    '--uniform-pants': uniform.pants,
  } as CSSProperties
}

function PerspectivePlayer({ player, x, y, scale, time, uniform }: {
  player: PlayerState
  x: number
  y: number
  scale: number
  time: number
  uniform: UniformPalette
}) {
  const speed = Math.hypot(player.vx, player.vy)
  const phase = player.id.split('').reduce((sum, letter) => sum + letter.charCodeAt(0), 0)
  const stride = Math.sin(time * Math.max(7, speed * 2.3) + phase) * Math.min(1.25, .35 + speed * .13)
  const lean = Math.max(-8, Math.min(8, player.vy * 2))

  return (
    <g transform={`translate(${x} ${y}) scale(${scale}) rotate(${lean})`} className={`perspective-player ${player.side}`} style={playerStyle(uniform)}>
      <ellipse className="player-shadow" cx="0" cy="7.2" rx="3.3" ry="1" />
      <path className="perspective-leg" d={`M-1 2.5 L${-1.35 - stride} 7`} />
      <path className="perspective-leg" d={`M1 2.5 L${1.35 + stride} 7`} />
      <path className="perspective-arm" d={`M-2.35 -1 L${-3.05 + stride * .7} 3.5`} />
      <path className="perspective-arm" d={`M2.35 -1 L${3.05 - stride * .7} 3.5`} />
      <path className="perspective-pants" d="M-1.8 1.5 L1.8 1.5 L1.25 4 L0 3.3 L-1.25 4 Z" />
      <path className="perspective-jersey" d="M-2.4 -2.2 Q0 -3.3 2.4 -2.2 L1.8 2.1 Q0 2.8 -1.8 2.1 Z" />
      <path className="perspective-shoulders" d="M-2.6 -1.8 Q0 -3.15 2.6 -1.8" />
      <circle className="perspective-helmet" cy="-4.6" r="2" />
      <path className="perspective-helmet-stripe" d="M0 -6.45 L0 -2.8" />
      <path className="perspective-facemask" d="M-1.6 -4.4 L1.8 -4.4 M1.7 -4.4 L2.35 -3.1" />
      <text className="perspective-number" textAnchor="middle" y=".2">{player.jersey}</text>
    </g>
  )
}

export function RbView({ frame, ballCarrierId, recommendedPath, showAi, offenseTeam, defenseTeam }: RbViewProps) {
  const runner = findPlayer(frame, ballCarrierId)
  if (!runner) return null
  const offenseUniform = getUniform(offenseTeam)
  const defenseUniform = getUniform(defenseTeam)

  const pathPoints = recommendedPath.points
    .map((point, index) => {
      const spot = projectRelative(point, runner)
      return `${index === 0 ? 'M' : 'L'} ${spot.x.toFixed(2)} ${spot.y.toFixed(2)}`
    })
    .join(' ')

  return (
    <svg className="field-svg rb-svg" viewBox="0 0 100 60" role="img" aria-label="Simulated first-person running back view" style={playerStyle(offenseUniform)}>
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" className="sky-top" />
          <stop offset="1" className="sky-bottom" />
        </linearGradient>
        <linearGradient id="lane-gradient" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" className="lane-start" />
          <stop offset="1" className="lane-end" />
        </linearGradient>
      </defs>
      <rect width="100" height="27" fill="url(#sky)" />
      <path d="M0 60 L18 27 L82 27 L100 60 Z" className="rb-field" />
      {[0, 1, 2, 3].map((line) => {
        const y = 56 - line * 8
        const inset = line * 5
        return <line key={line} x1={inset} x2={100 - inset} y1={y} y2={y} className="rb-yard-line" />
      })}
      <line x1="50" x2="50" y1="60" y2="27" className="rb-center-line" />
      {showAi && <path d={pathPoints} className="rb-best-path" />}

      {frame.players
        .filter((player) => player.id !== ballCarrierId && player.x >= runner.x - 1)
        .sort((a, b) => b.x - a.x)
        .map((player) => {
          const spot = projectRelative(player, runner)
          return <PerspectivePlayer key={player.id} player={player} x={spot.x} y={spot.y} scale={spot.scale} time={frame.time} uniform={player.side === 'offense' ? offenseUniform : defenseUniform} />
        })}
      <path d="M34 60 Q50 51 66 60" className="helmet-rim" />
    </svg>
  )
}
