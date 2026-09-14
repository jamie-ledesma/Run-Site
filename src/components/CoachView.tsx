import type { CSSProperties } from 'react'
import type { CandidatePath, FieldPoint, PlayFrame, PlayerState } from '../types'
import { getUniform, type UniformPalette } from '../data/uniforms'
import { findPlayer, pathToSvg } from '../lib/playEngine'

interface CoachViewProps {
  frame: PlayFrame
  ballCarrierId: string
  lineOfScrimmage: number
  recommendedPath: CandidatePath
  actualPath: FieldPoint[]
  showAi: boolean
  showThreat: boolean
  showFieldBackground: boolean
  offenseTeam: string
  defenseTeam: string
  primaryThreatId?: string
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

function PlayerFigure({ player, spot, time, uniform, isRunner }: {
  player: PlayerState
  spot: FieldPoint
  time: number
  uniform: UniformPalette
  isRunner: boolean
}) {
  const speed = Math.hypot(player.vx, player.vy)
  const angle = Math.atan2(player.vy * 1.55, Math.max(.1, player.vx) * 3.05) * 180 / Math.PI
  const phase = player.id.split('').reduce((sum, letter) => sum + letter.charCodeAt(0), 0)
  const stride = Math.sin(time * Math.max(7, speed * 2.5) + phase) * Math.min(.9, .25 + speed * .1)
  const size = player.role === 'OL' || ['LT', 'LG', 'C', 'RG', 'RT', 'DT'].includes(player.role ?? '') ? 1.12 : 1

  return (
    <g
      transform={`translate(${spot.x} ${spot.y}) rotate(${angle}) scale(${size})`}
      className={`top-player ${player.side} ${isRunner ? 'runner' : ''}`}
      style={playerStyle(uniform)}
    >
      <ellipse className="player-shadow" cx="0" cy="1.5" rx="2.5" ry="1.5" />
      <g className="limbs">
        <path className="player-leg" d={`M-0.8 1.2 L${-1.15 - stride} 3.1`} />
        <path className="player-leg" d={`M0.8 1.2 L${1.15 + stride} 3.1`} />
        <path className="player-arm" d={`M-1.7 -0.8 L${-2.25 + stride} 1.1`} />
        <path className="player-arm" d={`M1.7 -0.8 L${2.25 - stride} 1.1`} />
      </g>
      <path className="player-pants" d="M-1.25 .7 L1.25 .7 L1.05 2 L0 1.55 L-1.05 2 Z" />
      <path className="jersey-body" d="M-1.65 -1.45 Q0 -2.1 1.65 -1.45 L1.3 1.2 Q0 1.65 -1.3 1.2 Z" />
      <path className="shoulder-pads" d="M-1.9 -1.15 Q0 -2.1 1.9 -1.15" />
      <circle className="helmet-shell" cy="-2.6" r="1.22" />
      <path className="helmet-stripe" d="M0 -3.72 L0 -1.58" />
      <path className="face-mask" d="M-1 -2.75 Q0 -3.2 1 -2.75" />
      <text className="jersey-number" textAnchor="middle" dominantBaseline="central" y="-.15">{player.jersey}</text>
      {isRunner && <circle className="football" cx="1.65" cy=".25" r=".48" />}
    </g>
  )
}

export function CoachView({
  frame,
  ballCarrierId,
  lineOfScrimmage,
  recommendedPath,
  actualPath,
  showAi,
  showThreat,
  showFieldBackground,
  offenseTeam,
  defenseTeam,
  primaryThreatId,
}: CoachViewProps) {
  const runner = findPlayer(frame, ballCarrierId)
  const offenseUniform = getUniform(offenseTeam)
  const defenseUniform = getUniform(defenseTeam)
  const project = (point: FieldPoint) => ({
    x: 50 + (point.y - 26.65) * 1.55,
    y: 53 - (point.x - lineOfScrimmage) * 3.05,
  })

  return (
    <svg className="field-svg" viewBox="0 0 100 60" role="img" aria-label="Behind the quarterback field view">
      <defs>
        <pattern id="grass" width="100" height="12" patternUnits="userSpaceOnUse">
          <rect width="100" height="6" className="grass-a" />
          <rect y="6" width="100" height="6" className="grass-b" />
        </pattern>
        <radialGradient id="danger-gradient">
          <stop offset="0" className="danger-center" />
          <stop offset="1" className="danger-edge" />
        </radialGradient>
      </defs>
      {showFieldBackground && <rect width="100" height="60" fill="url(#grass)" />}
      {showFieldBackground && [8, 18, 28, 38, 48].map((y) => <line key={y} x1="0" x2="100" y1={y} y2={y} className="yard-line" />)}
      {showFieldBackground && <line x1="0" x2="100" y1="53" y2="53" className="line-of-scrimmage" />}

      {showThreat && frame.players.filter((player) => player.side === 'defense').map((player) => {
        const spot = project(player)
        return <circle key={`threat-${player.id}`} cx={spot.x} cy={spot.y} r={player.id === primaryThreatId ? 8 : 5.5} fill="url(#danger-gradient)" />
      })}

      {actualPath.length > 1 && <path d={pathToSvg(actualPath, project)} className="actual-path" />}
      {showAi && <path d={pathToSvg(recommendedPath.points, project)} className="best-path" />}

      {frame.players.map((player) => {
        const spot = project(player)
        const isRunner = player.id === ballCarrierId
        return <PlayerFigure key={player.id} player={player} spot={spot} time={frame.time} uniform={player.side === 'offense' ? offenseUniform : defenseUniform} isRunner={isRunner} />
      })}
      {runner && <circle cx={project(runner).x} cy={project(runner).y} r="3.2" className="runner-ring" />}
    </svg>
  )
}
