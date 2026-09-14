import { describe, expect, it } from 'vitest'
import type { PlayFrame } from '../types'
import { demoCatalog } from '../data/demoCatalog'
import { buildOrganizationSnapshot } from './organizationInsights'
import { analyzeFrame, distance, interpolateFrames } from './playEngine'

const frames: PlayFrame[] = [
  {
    time: 0,
    players: [
      { id: 'rb', jersey: '1', side: 'offense', x: 30, y: 26, vx: 4, vy: 0 },
      { id: 'd1', jersey: '9', side: 'defense', x: 36, y: 26, vx: 0, vy: 0 },
      { id: 'd2', jersey: '8', side: 'defense', x: 40, y: 40, vx: 0, vy: 0 },
    ],
  },
  {
    time: 1,
    players: [
      { id: 'rb', jersey: '1', side: 'offense', x: 34, y: 26, vx: 4, vy: 0 },
      { id: 'd1', jersey: '9', side: 'defense', x: 35, y: 26, vx: -1, vy: 0 },
      { id: 'd2', jersey: '8', side: 'defense', x: 40, y: 38, vx: 0, vy: -2 },
    ],
  },
]

describe('play engine', () => {
  it('measures field distance in yards', () => {
    expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5)
  })

  it('interpolates positions between tracking frames', () => {
    const frame = interpolateFrames(frames, 0.5)
    expect(frame.players[0].x).toBe(32)
    expect(frame.players[1].x).toBe(35.5)
  })

  it('returns a ranked, physically bounded recommendation', () => {
    const analysis = analyzeFrame(frames[0], 'rb')
    expect(analysis.recommended.points).toHaveLength(4)
    expect(analysis.recommended.points.every((point) => point.y >= 1 && point.y <= 52.3)).toBe(true)
    expect(analysis.alternatives).toHaveLength(2)
    expect(analysis.confidence).toBeGreaterThanOrEqual(51)
    expect(analysis.rationale).toHaveLength(4)
    expect(analysis.rationale.map((factor) => factor.label)).toContain('Blocking influence')
  })

  it('labels simulated organization insights without presenting them as verified tendencies', () => {
    const snapshot = buildOrganizationSnapshot('NE', demoCatalog)
    expect(snapshot.laneMix.reduce((sum, lane) => sum + lane.count, 0)).toBe(10)
    expect(snapshot.laneMix.filter((lane) => lane.count > 0).length).toBeGreaterThan(1)
    expect(snapshot.isVerified).toBe(false)
    expect(snapshot.scope).toBe('10 simulated reps')
  })
})
